const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db, failedAttempts, tokenStore } = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_TTL_SECONDS = 2 * 60 * 60; // 2h absolute TTL
const BLOCK_MINUTES = 15;

// 🔹 Localiza usuário por e-mail
function getUserByEmail(email) {
  return db.users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase());
}

// 🔹 Verifica se usuário está bloqueado
function isBlocked(email) {
  const entry = failedAttempts.get(email);
  if (!entry) return false;

  if (entry.blockedUntil && Date.now() < entry.blockedUntil) return true;

  if (entry.blockedUntil && Date.now() >= entry.blockedUntil) {
    failedAttempts.delete(email);
    return false;
  }

  return false;
}

// 🔹 Registra tentativa de login mal-sucedida
function recordFailedAttempt(email) {
  const entry = failedAttempts.get(email) || { count: 0, blockedUntil: null };
  entry.count += 1;

  if (entry.count >= 3) {
    entry.blockedUntil = Date.now() + BLOCK_MINUTES * 60 * 1000;
  }

  failedAttempts.set(email, entry);
}

// 🔹 Reseta tentativas ao logar com sucesso
function resetAttempts(email) {
  failedAttempts.delete(email);
}

// 🔹 Login de usuário
function login(email, password) {
  if (isBlocked(email)) {
    const until = failedAttempts.get(email).blockedUntil;
    const ms = until - Date.now();
    const minutes = Math.ceil(ms / 60000);
    const err = new Error(`Acesso bloqueado. Tente novamente em ${minutes} minuto(s).`);
    err.status = 403;
    throw err;
  }

  const user = getUserByEmail(email);

  if (!user || user.password !== password) {
    recordFailedAttempt(email);
    const err = new Error('Credenciais inválidas');
    err.status = 401;
    throw err;
  }

  resetAttempts(email);

  const jti = uuidv4();
  const nowSec = Math.floor(Date.now() / 1000);

  const token = jwt.sign(
    { sub: user.id, email: user.email, jti, iat: nowSec },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL_SECONDS }
  );

  tokenStore.set(jti, {
    userId: user.id,
    email: user.email,
    issuedAt: Date.now(),
    lastActivity: Date.now(),
    revoked: false,
  });

  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

// 🔹 Logout (revoga token)
function logout(jti) {
  const entry = tokenStore.get(jti);
  if (entry) entry.revoked = true;
}

// 🔹 Registro de novo usuário
function registerUser(data) {
  const { email, password, name } = data;

  const existingUser = db.users.find(u => u.email === email);
  if (existingUser) {
    throw new Error('Usuário já existe');
  }

  const newUser = {
    id: uuidv4(),
    email,
    password,
    name,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  return newUser;
}

// ✅ Exporta todas as funções
module.exports = {
  login,
  logout,
  registerUser,
};
