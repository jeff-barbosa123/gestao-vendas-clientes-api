const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const repo = require("../../db/repository");
const { issueTokens } = require("./tokens");

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const base = (process.env.WEB_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || base + "/api/auth/google/callback";
  return { clientId, clientSecret, redirectUri };
}

function isEnabled() {
  const { clientId, clientSecret } = config();
  return Boolean(clientId && clientSecret);
}

const rand = (n) => crypto.randomBytes(n).toString("base64url");

// Authorization Code + PKCE (S256) + state + nonce.
function createAuthRequest() {
  const { clientId, redirectUri } = config();
  const state = rand(24);
  const verifier = rand(48);
  const nonce = rand(24);
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return { url: AUTH_URL + "?" + params.toString(), cookie: [state, verifier, nonce].join(".") };
}

// Dependencias externas isoladas para permitir stub em testes (sem rede).
const deps = {
  async getClaims({ code, verifier, nonce }) {
    const { clientId, clientSecret, redirectUri } = config();
    const resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.id_token) throw fail("exchange_failed", 502);
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: data.id_token, audience: clientId });
    const claims = ticket.getPayload();
    if (!claims || claims.nonce !== nonce) throw fail("invalid_nonce", 400);
    return claims;
  },
};

function fail(code, status) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  return err;
}

async function resolveUser(claims) {
  const email = String(claims.email || "").trim().toLowerCase();
  if (!claims.sub || !email) throw fail("invalid_profile", 400);
  if (claims.email_verified !== true) throw fail("email_not_verified", 403);

  let user = await repo.getUserByGoogleSub(claims.sub);
  if (!user) {
    const existing = await repo.getUserByEmail(email);
    if (existing) {
      user = await repo.linkGoogleAccount(existing.id, claims.sub);
    } else {
      user = await repo.createUser({
        email,
        password: null,
        name: claims.name || email.split("@")[0],
        emailVerified: true,
        googleSub: claims.sub,
        authProvider: "google",
      });
    }
  }
  if (user.blocked) throw fail("blocked", 403);
  return user;
}

async function signIn({ code, verifier, nonce, meta = {} }) {
  const claims = await deps.getClaims({ code, verifier, nonce });
  const user = await resolveUser(claims);
  const updated = (await repo.updateUserLogin(user.id, new Date().toISOString(), 0, user.status_usuario || "ATIVO")) || user;
  const { token, refreshToken, exp, jti, refreshJti } = await issueTokens(updated, meta);
  return {
    token,
    refreshToken,
    exp,
    jti,
    refreshJti,
    user: { id: updated.id, email: updated.email, name: updated.name, username: updated.username || null },
  };
}

module.exports = { isEnabled, createAuthRequest, signIn, resolveUser, deps, config };
