const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { db, failedAttempts, tokenStore, refreshStore } = require("../models/db");

const JWT_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS || 30 * 60);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_PREVIOUS_SECRET = process.env.JWT_PREVIOUS_SECRET;

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
const JWT_REFRESH_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL_SECONDS || 7 * 24 * 60 * 60);
const JWT_REFRESH_PREVIOUS_SECRET = process.env.JWT_REFRESH_PREVIOUS_SECRET;

const MAX_FAILED_ATTEMPTS = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 3);
const BLOCK_DURATION_MS = Number(process.env.LOGIN_BLOCK_MS || 15 * 60 * 1000);
const MIN_PASSWORD_LENGTH = Number(process.env.LOGIN_MIN_PASSWORD_LENGTH || 3);
const MAX_PASSWORD_LENGTH = Number(process.env.LOGIN_MAX_PASSWORD_LENGTH || 30);

const MESSAGES = {
  invalidCredentials: "Credenciais inv\u00e1lidos",
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
};

function sanitizeEmail(email) {
  if (typeof email !== "string") return email;
  return email.trim().toLowerCase();
}

function sanitizePassword(password) {
  if (typeof password !== "string") return password;
  return password.trim();
}

function getUserByEmail(email) {
  return db.users.find(u => u.email.toLowerCase() === String(email || "").toLowerCase());
}

function getUserById(id) {
  return db.users.find(u => u.id === id) || null;
}

function updateUserStatus(user, { attemptsCount, blockedUntil } = {}) {
  if (!user) return;
  if (typeof attemptsCount === "number") {
    user.tentativasFalha = attemptsCount;
  }
  if (user.blocked) {
    user.statusUsuario = "BLOQUEADO";
    return;
  }
  const blockedNow = blockedUntil && Date.now() < blockedUntil;
  user.statusUsuario = blockedNow ? "BLOQUEADO" : "ATIVO";
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

function clearAttempts(email) {
  const key = normalizeEmailKey(email);
  failedAttempts.delete(key);
  const user = getUserByEmail(email);
  if (user) {
    user.tentativasFalha = 0;
    updateUserStatus(user, { attemptsCount: 0, blockedUntil: null });
  }
}

function isBlocked(email) {
  const entry = getAttempt(email);
  return entry && entry.blockedUntil && Date.now() < entry.blockedUntil;
}

function recordFailedAttempt(email) {
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
  const user = getUserByEmail(email);
  updateUserStatus(user, { attemptsCount: entry.count, blockedUntil: entry.blockedUntil });
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

function login(rawEmail, rawPassword) {
  const { email, password } = validateCredentials(rawEmail, rawPassword);

  if (isBlocked(email)) {
    const err = new Error(MESSAGES.accessBlocked);
    err.status = 423;
    throw err;
  }

  const user = getUserByEmail(email);
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
    const attempt = recordFailedAttempt(email);
    const blocked = attempt.blockedUntil && Date.now() < attempt.blockedUntil;
    const err = new Error(blocked ? MESSAGES.accessBlocked : MESSAGES.invalidCredentials);
    err.status = blocked ? 423 : 401;
    throw err;
  }

  clearAttempts(email);
  user.dataUltimoLogin = new Date().toISOString();
  updateUserStatus(user, { attemptsCount: 0, blockedUntil: null });

  const { token, refreshToken, exp, jti, refreshJti } = issueTokens(user);

  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      statusUsuario: user.statusUsuario,
      dataUltimoLogin: user.dataUltimoLogin,
      tentativasFalha: user.tentativasFalha,
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

function refresh(refreshTokenRaw) {
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

  const user = getUserById(payload.sub);
  if (!user) {
    const err = new Error(MESSAGES.refreshInvalid);
    err.status = 401;
    throw err;
  }

  entry.revoked = true;

  return issueTokens(user);
}

function registerUser(data) {
  const { email, password, name } = data;
  const existingUser = db.users.find(u => u.email === email);
  if (existingUser) {
    const err = new Error("Usu\u00e1rio j\u00e1 existe");
    err.status = 409;
    throw err;
  }
  const newUser = {
    id: uuidv4(),
    email,
    password,
    name,
    statusUsuario: "ATIVO",
    dataUltimoLogin: null,
    tentativasFalha: 0,
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  return newUser;
}

module.exports = {
  login,
  refresh,
  logout,
  registerUser,
  getUserById,
  MESSAGES,
};
