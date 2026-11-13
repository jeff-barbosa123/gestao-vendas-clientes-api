const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const sessionStore = require("../sessionStore");
const { JWT_TTL_SECONDS, JWT_SECRET, JWT_REFRESH_SECRET, JWT_REFRESH_TTL_SECONDS, RESET_TOKEN_SECRET, WEB_BASE_URL, EMAIL_VERIFY_TOKEN_SECRET } = require("./config");

function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(`${token}.${RESET_TOKEN_SECRET}`)
    .digest("hex");
}

function hashEmailVerificationToken(token) {
  return crypto
    .createHash("sha256")
    .update(`${token}.${EMAIL_VERIFY_TOKEN_SECRET}`)
    .digest("hex");
}

function buildResetLink(token) {
  const base = WEB_BASE_URL.endsWith("/") ? WEB_BASE_URL.slice(0, -1) : WEB_BASE_URL;
  return `${base}/reset-password.html?token=${encodeURIComponent(token)}`;
}

function signAccessToken(user, jti) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado. Configure no arquivo .env.local');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  return jwt.sign({ sub: user.id, email: user.email, jti, iat: nowSec }, JWT_SECRET, {
    expiresIn: JWT_TTL_SECONDS,
  });
}

function signRefreshToken(user, refreshJti) {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET não configurado. Configure no arquivo .env.local');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  return jwt.sign({ sub: user.id, email: user.email, jti: refreshJti, iat: nowSec }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_TTL_SECONDS,
  });
}

async function issueTokens(user) {
  try {
    if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
      const err = new Error('JWT_SECRET ou JWT_REFRESH_SECRET não configurado. Configure no arquivo .env.local');
      err.status = 500;
      err.code = 'JWT_CONFIG_ERROR';
      throw err;
    }

    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const token = signAccessToken(user, accessJti);
    const refreshToken = signRefreshToken(user, refreshJti);

    const now = Date.now();
    // Sessões gravadas em memória + PostgreSQL (sobrevivem a reinício/deploy da API)
    await sessionStore.save("access", {
      jti: accessJti,
      userId: user.id,
      email: user.email,
      issuedAt: now,
      lastActivity: now,
      revoked: false,
      expiresAt: now + JWT_TTL_SECONDS * 1000,
    });

    await sessionStore.save("refresh", {
      jti: refreshJti,
      userId: user.id,
      email: user.email,
      revoked: false,
      issuedAt: now,
      lastActivity: now,
      expiresAt: now + JWT_REFRESH_TTL_SECONDS * 1000,
    });

    return {
      token,
      refreshToken,
      exp: Date.now() + JWT_TTL_SECONDS * 1000,
      jti: accessJti,
      refreshJti,
    };
  } catch (err) {
    // Re-throw se já tem status definido
    if (err.status) throw err;
    
    // Caso contrário, trata como erro de configuração
    const configError = new Error('Erro ao gerar tokens. Verifique se JWT_SECRET e JWT_REFRESH_SECRET estão configurados no .env.local');
    configError.status = 500;
    configError.code = 'JWT_CONFIG_ERROR';
    configError.originalError = process.env.NODE_ENV !== 'production' ? err.message : undefined;
    throw configError;
  }
}

module.exports = {
  hashResetToken,
  hashEmailVerificationToken,
  buildResetLink,
  signAccessToken,
  signRefreshToken,
  issueTokens,
};
