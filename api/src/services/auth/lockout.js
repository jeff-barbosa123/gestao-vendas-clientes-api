const repo = require("../../db/repository");
const { failedAttempts } = require("../../models/db");
const { MAX_FAILED_ATTEMPTS, BLOCK_DURATION_MS } = require("./config");
const { MESSAGES } = require("./messages");
const { getUserByEmail } = require("./userLookup");

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
  
  // Tenta atualizar no banco, mas não falha se banco não estiver disponível
  try {
    const user = await getUserByEmail(email);
    if (user) {
      const statusUsuario = computeStatus(user, null);
      await repo.updateUserLogin(user.id, user.data_ultimo_login, 0, statusUsuario);
    }
  } catch (dbError) {
    // Se banco não disponível, apenas limpa em memória (para desenvolvimento)
    console.warn('Aviso: Não foi possível limpar tentativas no banco:', dbError.message);
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
  
  // Tenta atualizar no banco, mas não falha se banco não estiver disponível
  try {
    const user = await getUserByEmail(email);
    if (user) {
      const statusUsuario = computeStatus(user, entry.blockedUntil);
      await repo.updateUserLogin(user.id, user.data_ultimo_login, entry.count, statusUsuario);
    }
  } catch (dbError) {
    // Se banco não disponível, apenas registra em memória (para desenvolvimento)
    console.warn('Aviso: Não foi possível atualizar tentativas no banco:', dbError.message);
  }
  
  return entry;
}

// Registra a tentativa inválida e devolve o erro adequado (401 ou 423 se bloqueou).
// Antes o "throw" ficava dentro do try e o catch trocava o 423 por 401.
async function buildFailedLoginError(email) {
  let blocked = false;
  try {
    const attempt = await recordFailedAttempt(email);
    blocked = Boolean(attempt.blockedUntil && Date.now() < attempt.blockedUntil);
  } catch (_attemptError) {
    // Falha ao registrar tentativa (ex.: banco indisponível): responde como credencial inválida
  }
  const err = new Error(blocked ? MESSAGES.accessBlocked : MESSAGES.invalidCredentials);
  err.status = blocked ? 423 : 401;
  return err;
}

module.exports = {
  normalizeEmailKey,
  getAttempt,
  setAttempt,
  computeStatus,
  clearAttempts,
  isBlocked,
  recordFailedAttempt,
  buildFailedLoginError,
};
