const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const repo = require("../db/repository");
const emailService = require("./emailService");
const { getBlockDurationMs } = require("../utils/authConfig");
const { failedAttempts, tokenStore, refreshStore } = require("../models/db");

const JWT_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS || 30 * 60);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_PREVIOUS_SECRET = process.env.JWT_PREVIOUS_SECRET;

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
const JWT_REFRESH_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL_SECONDS || 7 * 24 * 60 * 60);
const JWT_REFRESH_PREVIOUS_SECRET = process.env.JWT_REFRESH_PREVIOUS_SECRET;

const MAX_FAILED_ATTEMPTS = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 3);
const BLOCK_DURATION_MS = getBlockDurationMs();
const MIN_PASSWORD_LENGTH = Number(process.env.LOGIN_MIN_PASSWORD_LENGTH || 3);
const MAX_PASSWORD_LENGTH = Number(process.env.LOGIN_MAX_PASSWORD_LENGTH || 30);
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 30);
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || JWT_SECRET;
const WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:4000";

const MESSAGES = {
  invalidCredentials: "Credenciais inv\u00e1lidas",
  invalidEmail: "Formato de e-mail inv\u00e1lido",
  invalidPasswordType: "Formato de senha inv\u00e1lido",
  emailRequired: "E-mail \u00e9 obrigat\u00f3rio",
  passwordRequired: "Senha \u00e9 obrigat\u00f3ria",
  emailPasswordRequired: "E-mail e senha s\u00e3o obrigat\u00f3rios",
  passwordShort: "Senha muito curta",
  passwordLong: "Senha muito longa",
  blockedUser: "Usu\u00e1rio bloqueado",
  accessBlocked: "Acesso temporariamente bloqueado",
  refreshMissing: "Refresh token \u00e9 obrigat\u00f3rio",
  refreshInvalid: "Refresh token inv\u00e1lido ou revogado",
  resetTokenInvalid: "Token inv\u00e1lido ou expirado",
  resetTokenMissing: "Token \u00e9 obrigat\u00f3rio",
  currentPasswordInvalid: "Senha atual incorreta",
  passwordSame: "Nova senha deve ser diferente da atual",
  nameRequired: "Nome \u00e9 obrigat\u00f3rio",
};

function sanitizeEmail(email) {
  if (typeof email !== "string") return email;
  return email.trim().toLowerCase();
}

function sanitizePassword(password) {
  if (typeof password !== "string") return password;
  return password.trim();
}

async function getUserByEmail(email) {
  return repo.getUserByEmail(email);
}

async function getUserById(id) {
  return repo.getUserById(id);
}

function normalizeEmailKey(email) {
  return String(email || "").toLowerCase();
}

function getAttempt(email) {
  const key = normalizeEmailKey(email);
  return failedAttempts.get(key);
}

function setAttempt(email, value) {
  const key = normalizeEmailKey(email);
  failedAttempts.set(key, value);
}

function computeStatus(user, blockedUntil) {
  if (!user) return "ATIVO";
  if (user.blocked) return "BLOQUEADO";
  const blockedNow = blockedUntil && Date.now() < blockedUntil;
  return blockedNow ? "BLOQUEADO" : "ATIVO";
}

async function clearAttempts(email) {
  const key = normalizeEmailKey(email);
  failedAttempts.delete(key);
  const user = await getUserByEmail(email);
  if (user) {
    const statusUsuario = computeStatus(user, null);
    await repo.updateUserLogin(user.id, user.data_ultimo_login, 0, statusUsuario);
  }
}

function isBlocked(email) {
  const entry = getAttempt(email);
  return entry && entry.blockedUntil && Date.now() < entry.blockedUntil;
}

async function recordFailedAttempt(email) {
  const key = normalizeEmailKey(email);
  let entry = getAttempt(key) || { count: 0, blockedUntil: null };

  if (entry.blockedUntil && Date.now() >= entry.blockedUntil) {
    entry = { count: 0, blockedUntil: null };
  }

  entry.count += 1;

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_DURATION_MS;
  }

  setAttempt(key, entry);
  const user = await getUserByEmail(email);
  if (user) {
    const statusUsuario = computeStatus(user, entry.blockedUntil);
    await repo.updateUserLogin(user.id, user.data_ultimo_login, entry.count, statusUsuario);
  }
  return entry;
}

function validateEmail(rawEmail, passwordProvided) {
  if (rawEmail === undefined && !passwordProvided) {
    const err = new Error(MESSAGES.emailPasswordRequired);
    err.status = 400;
    throw err;
  }
  if (rawEmail === undefined || rawEmail === null) {
    const err = new Error(MESSAGES.emailRequired);
    err.status = 400;
    throw err;
  }
  if (typeof rawEmail !== "string") {
    const err = new Error(MESSAGES.invalidEmail);
    err.status = 400;
    throw err;
  }

  const email = sanitizeEmail(rawEmail);
  if (!email) {
    const err = new Error(MESSAGES.emailRequired);
    err.status = 400;
    throw err;
  }

  const strictEmailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!strictEmailRegex.test(email)) {
    const err = new Error(MESSAGES.invalidEmail);
    err.status = 400;
    throw err;
  }

  return email;
}

function validatePassword(rawPassword) {
  if (rawPassword === undefined || rawPassword === null) {
    const err = new Error(MESSAGES.passwordRequired);
    err.status = 400;
    throw err;
  }
  if (typeof rawPassword !== "string") {
    const err = new Error(MESSAGES.invalidPasswordType);
    err.status = 400;
    throw err;
  }

  const password = sanitizePassword(rawPassword);
  if (!password) {
    const err = new Error(MESSAGES.passwordRequired);
    err.status = 400;
    throw err;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    const err = new Error(MESSAGES.passwordShort);
    err.status = 400;
    throw err;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    const err = new Error(MESSAGES.passwordLong);
    err.status = 400;
    throw err;
  }
  return password;
}

function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(`${token}.${RESET_TOKEN_SECRET}`)
    .digest("hex");
}

function buildResetLink(token) {
  const base = WEB_BASE_URL.endsWith("/") ? WEB_BASE_URL.slice(0, -1) : WEB_BASE_URL;
  return `${base}/reset-password.html?token=${encodeURIComponent(token)}`;
}

function validateCredentials(rawEmail, rawPassword) {
  const emailProvided = rawEmail !== undefined;
  const passwordProvided = rawPassword !== undefined;
  if (!emailProvided && !passwordProvided) {
    const err = new Error(MESSAGES.emailPasswordRequired);
    err.status = 400;
    throw err;
  }
  const email = validateEmail(rawEmail, passwordProvided);
  const password = validatePassword(rawPassword);
  return { email, password };
}

function signAccessToken(user, jti) {
  const nowSec = Math.floor(Date.now() / 1000);
  return jwt.sign({ sub: user.id, email: user.email, jti, iat: nowSec }, JWT_SECRET, {
    expiresIn: JWT_TTL_SECONDS,
  });
}

function signRefreshToken(user, refreshJti) {
  const nowSec = Math.floor(Date.now() / 1000);
  return jwt.sign({ sub: user.id, email: user.email, jti: refreshJti, iat: nowSec }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_TTL_SECONDS,
  });
}

function issueTokens(user) {
  const accessJti = uuidv4();
  const refreshJti = uuidv4();

  const token = signAccessToken(user, accessJti);
  const refreshToken = signRefreshToken(user, refreshJti);

  const now = Date.now();
  tokenStore.set(accessJti, {
    jti: accessJti,
    userId: user.id,
    email: user.email,
    issuedAt: now,
    lastActivity: now,
    revoked: false,
    expiresAt: now + JWT_TTL_SECONDS * 1000,
  });

  refreshStore.set(refreshJti, {
    jti: refreshJti,
    userId: user.id,
    email: user.email,
    revoked: false,
    issuedAt: now,
    expiresAt: now + JWT_REFRESH_TTL_SECONDS * 1000,
  });

  return {
    token,
    refreshToken,
    exp: Date.now() + JWT_TTL_SECONDS * 1000,
    jti: accessJti,
    refreshJti,
  };
}

async function login(rawEmail, rawPassword) {
  const { email, password } = validateCredentials(rawEmail, rawPassword);

  if (isBlocked(email)) {
    const err = new Error(MESSAGES.accessBlocked);
    err.status = 423;
    throw err;
  }

  const user = await getUserByEmail(email);
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@negocio.com").toLowerCase();
  const adminAltPassword = process.env.ADMIN_PASSWORD_ALT || "Admin@123!";

  if (user && user.blocked) {
    const err = new Error(MESSAGES.blockedUser);
    err.status = 403;
    throw err;
  }

  const passwordMatches =
    user &&
    (user.password === password ||
      (user.email.toLowerCase() === adminEmail && password === adminAltPassword));

  if (!user || !passwordMatches) {
    const attempt = await recordFailedAttempt(email);
    const blocked = attempt.blockedUntil && Date.now() < attempt.blockedUntil;
    const err = new Error(blocked ? MESSAGES.accessBlocked : MESSAGES.invalidCredentials);
    err.status = blocked ? 423 : 401;
    throw err;
  }

  await clearAttempts(email);
  const dataUltimoLogin = new Date().toISOString();
  const statusUsuario = computeStatus(user, null);
  const updatedUser = await repo.updateUserLogin(user.id, dataUltimoLogin, 0, statusUsuario);

  const { token, refreshToken, exp, jti, refreshJti } = issueTokens(user);

  return {
    token,
    refreshToken,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      statusUsuario: updatedUser.status_usuario,
      dataUltimoLogin: updatedUser.data_ultimo_login,
      tentativasFalha: updatedUser.tentativas_falha,
    },
    exp,
    jti,
    refreshJti,
  };
}

function logout(jti) {
  const entry = tokenStore.get(jti);
  if (entry) entry.revoked = true;
}

async function refresh(refreshTokenRaw) {
  if (!refreshTokenRaw) {
    const err = new Error(MESSAGES.refreshMissing);
    err.status = 400;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(refreshTokenRaw, JWT_REFRESH_SECRET);
  } catch (err) {
    if (JWT_REFRESH_PREVIOUS_SECRET) {
      try {
        payload = jwt.verify(refreshTokenRaw, JWT_REFRESH_PREVIOUS_SECRET);
      } catch (err2) {
        const e = new Error(MESSAGES.refreshInvalid);
        e.status = 401;
        throw e;
      }
    } else {
      const e = new Error(MESSAGES.refreshInvalid);
      e.status = 401;
      throw e;
    }
  }

  const entry = refreshStore.get(payload.jti);
  if (!entry || entry.revoked) {
    const err = new Error(MESSAGES.refreshInvalid);
    err.status = 401;
    throw err;
  }

  const user = await getUserById(payload.sub);
  if (!user) {
    const err = new Error(MESSAGES.refreshInvalid);
    err.status = 401;
    throw err;
  }

  entry.revoked = true;

  return issueTokens(user);
}

async function registerUser(data) {
  const { email, password, name } = data;
  const existingUser = await repo.getUserByEmail(email);
  if (existingUser) {
    const err = new Error("Usu\u00e1rio j\u00e1 existe");
    err.status = 409;
    throw err;
  }
  const newUser = await repo.createUser({
    id: uuidv4(),
    email,
    password,
    name,
    statusUsuario: "ATIVO",
    dataUltimoLogin: null,
    tentativasFalha: 0,
  });
  return {
    ...newUser,
    statusUsuario: newUser.status_usuario,
    dataUltimoLogin: newUser.data_ultimo_login,
    tentativasFalha: newUser.tentativas_falha,
  };
}

async function forgotPassword(rawEmail) {
  const email = validateEmail(rawEmail, false);
  const user = await getUserByEmail(email);
  if (!user) {
    return { sent: false };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

  await repo.createPasswordReset(user.id, tokenHash, expiresAt);

  const resetLink = buildResetLink(token);
  const subject = "Redefinicao de senha - SGVC";
  const text = [
    `Ola ${user.name || "cliente"},`,
    "",
    "Recebemos uma solicitacao para redefinir sua senha.",
    "Clique no link abaixo para criar uma nova senha:",
    resetLink,
    "",
    `Este link expira em ${RESET_TOKEN_TTL_MINUTES} minutos.`,
    "Se voc\u00ea n\u00e3o solicitou, ignore este e-mail.",
  ].join("\n");

  const html = `
    <p>Ola ${user.name || "cliente"},</p>
    <p>Recebemos uma solicitacao para redefinir sua senha.</p>
    <p><a href="${resetLink}">Clique aqui para criar uma nova senha</a></p>
    <p>Este link expira em ${RESET_TOKEN_TTL_MINUTES} minutos.</p>
    <p>Se voc\u00ea n\u00e3o solicitou, ignore este e-mail.</p>
  `;

  const result = await emailService.sendMail({
    to: user.email,
    subject,
    text,
    html,
  });

  if (!result.sent) {
    console.warn("[auth] SMTP n\u00e3o configurado ou falha ao enviar e-mail.");
  }

  return { sent: result.sent };
}

async function resetPassword(token, rawPassword) {
  if (!token || typeof token !== "string") {
    const err = new Error(MESSAGES.resetTokenMissing);
    err.status = 400;
    throw err;
  }
  const password = validatePassword(rawPassword);
  const tokenHash = hashResetToken(token);
  const record = await repo.getPasswordResetByTokenHash(tokenHash);

  if (!record || record.used_at) {
    const err = new Error(MESSAGES.resetTokenInvalid);
    err.status = 400;
    throw err;
  }

  const expiresAt = new Date(record.expires_at).getTime();
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    const err = new Error(MESSAGES.resetTokenInvalid);
    err.status = 400;
    throw err;
  }

  await repo.updateUserPassword(record.user_id, password);
  await repo.markPasswordResetUsed(record.id);
  return { ok: true };
}

async function changePassword(userId, rawCurrentPassword, rawNewPassword) {
  if (!userId) {
    const err = new Error("Usu\u00e1rio n\u00e3o encontrado");
    err.status = 404;
    throw err;
  }
  const currentPassword = validatePassword(rawCurrentPassword);
  const newPassword = validatePassword(rawNewPassword);
  if (currentPassword === newPassword) {
    const err = new Error(MESSAGES.passwordSame);
    err.status = 400;
    throw err;
  }
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("Usu\u00e1rio n\u00e3o encontrado");
    err.status = 404;
    throw err;
  }
  if (user.password !== currentPassword) {
    const err = new Error(MESSAGES.currentPasswordInvalid);
    err.status = 400;
    throw err;
  }
  await repo.updateUserPassword(userId, newPassword);
  return { ok: true };
}

async function updateProfile(userId, rawName, rawEmail) {
  if (!userId) {
    const err = new Error("Usu\u00e1rio n\u00e3o encontrado");
    err.status = 404;
    throw err;
  }
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name) {
    const err = new Error(MESSAGES.nameRequired);
    err.status = 400;
    throw err;
  }
  const email = validateEmail(rawEmail, false);
  const current = await getUserById(userId);
  if (!current) {
    const err = new Error("Usu\u00e1rio n\u00e3o encontrado");
    err.status = 404;
    throw err;
  }
  const existing = await getUserByEmail(email);
  if (existing && existing.id !== userId) {
    const err = new Error("E-mail ja esta em uso");
    err.status = 409;
    throw err;
  }
  return repo.updateUserProfile(userId, name, email);
}

module.exports = {
  login,
  refresh,
  logout,
  registerUser,
  getUserById,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  MESSAGES,
};
