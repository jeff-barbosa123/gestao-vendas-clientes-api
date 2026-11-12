/**
 * Sessões de autenticação com persistência no PostgreSQL.
 *
 * Os Maps tokenStore/refreshStore (models/db.js) continuam sendo o cache rápido usado em cada
 * requisição. Toda criação/revogação também é gravada na tabela auth_sessions; quando a API
 * reinicia (deploy, queda), a sessão que não está no cache é carregada do banco, e o usuário
 * continua logado.
 *
 * Sem DATABASE_URL (modo desenvolvimento sem banco), funciona só em memória, como antes.
 */
const { tokenStore, refreshStore } = require("../models/db");
const db = require("../db");

// Evita uma escrita no banco a cada requisição: last_activity só é persistido a cada 60s
const TOUCH_PERSIST_INTERVAL_MS = 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function storeFor(kind) {
  return kind === "refresh" ? refreshStore : tokenStore;
}

function logPersistError(action, err) {
  // Persistência é "melhor esforço": se o banco falhar, a sessão continua válida em memória
  if (process.env.NODE_ENV !== "test") {
    console.warn(`[SESSION] Falha ao ${action} sessão no banco:`, err && err.message);
  }
}

function rowToEntry(row) {
  return {
    jti: row.jti,
    userId: row.user_id,
    email: row.email,
    issuedAt: new Date(row.issued_at).getTime(),
    lastActivity: new Date(row.last_activity).getTime(),
    expiresAt: new Date(row.expires_at).getTime(),
    revoked: Boolean(row.revoked),
    persistedActivity: new Date(row.last_activity).getTime(),
  };
}

async function save(kind, entry) {
  const entryWithMeta = { ...entry, persistedActivity: entry.lastActivity || entry.issuedAt };
  storeFor(kind).set(entry.jti, entryWithMeta);
  if (!hasDatabase()) return entryWithMeta;
  try {
    await db.query(
      `INSERT INTO auth_sessions (jti, kind, user_id, email, issued_at, last_activity, expires_at, revoked)
       VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0), to_timestamp($6 / 1000.0), to_timestamp($7 / 1000.0), $8)
       ON CONFLICT (jti) DO NOTHING`,
      [
        entry.jti,
        kind,
        entry.userId,
        entry.email,
        entry.issuedAt,
        entry.lastActivity || entry.issuedAt,
        entry.expiresAt,
        Boolean(entry.revoked),
      ]
    );
  } catch (err) {
    logPersistError("gravar", err);
  }
  return entryWithMeta;
}

/**
 * Busca a sessão: primeiro no cache em memória, depois no banco (após reinício da API).
 */
async function get(kind, jti) {
  if (!jti) return null;
  const store = storeFor(kind);
  const cached = store.get(jti);
  if (cached) return cached;
  if (!hasDatabase()) return null;
  try {
    const result = await db.query(
      "SELECT * FROM auth_sessions WHERE jti = $1 AND kind = $2 AND expires_at > NOW()",
      [jti, kind]
    );
    if (!result.rows[0]) return null;
    const entry = rowToEntry(result.rows[0]);
    store.set(jti, entry);
    return entry;
  } catch (err) {
    logPersistError("carregar", err);
    return null;
  }
}

async function revoke(kind, jti) {
  if (!jti) return;
  const entry = storeFor(kind).get(jti);
  if (entry) entry.revoked = true;
  if (!hasDatabase()) return;
  try {
    await db.query("UPDATE auth_sessions SET revoked = TRUE WHERE jti = $1", [jti]);
  } catch (err) {
    logPersistError("revogar", err);
  }
}

/**
 * Atualiza a última atividade (janela de inatividade). Persiste no máximo a cada 60s.
 */
function touch(entry, now = Date.now()) {
  if (!entry) return;
  entry.lastActivity = now;
  if (!hasDatabase()) return;
  if (entry.persistedActivity && now - entry.persistedActivity < TOUCH_PERSIST_INTERVAL_MS) return;
  entry.persistedActivity = now;
  db.query("UPDATE auth_sessions SET last_activity = to_timestamp($2 / 1000.0) WHERE jti = $1", [
    entry.jti,
    now,
  ]).catch((err) => logPersistError("atualizar", err));
}

async function cleanupExpired() {
  const now = Date.now();
  for (const store of [tokenStore, refreshStore]) {
    for (const [jti, entry] of store.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) store.delete(jti);
    }
  }
  if (!hasDatabase()) return;
  try {
    await db.query("DELETE FROM auth_sessions WHERE expires_at < NOW() - INTERVAL '1 day'");
  } catch (err) {
    logPersistError("limpar", err);
  }
}

const cleanupTimer = setInterval(() => {
  cleanupExpired().catch(() => {});
}, CLEANUP_INTERVAL_MS);
if (typeof cleanupTimer.unref === "function") cleanupTimer.unref();

module.exports = {
  save,
  get,
  revoke,
  touch,
  cleanupExpired,
};
