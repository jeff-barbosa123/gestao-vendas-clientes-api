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
    userAgent: row.user_agent || null,
    pairJti: row.pair_jti || null,
  };
}

async function save(kind, entry) {
  const entryWithMeta = { ...entry, persistedActivity: entry.lastActivity || entry.issuedAt };
  storeFor(kind).set(entry.jti, entryWithMeta);
  if (!hasDatabase()) return entryWithMeta;
  try {
    await db.query(
      `INSERT INTO auth_sessions (jti, kind, user_id, email, issued_at, last_activity, expires_at, revoked, user_agent, pair_jti)
       VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0), to_timestamp($6 / 1000.0), to_timestamp($7 / 1000.0), $8, $9, $10)
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
        entry.userAgent || null,
        entry.pairJti || null,
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

/**
 * Sessoes (logins) ativas do usuario: uma por refresh token valido, com a atividade do access token pareado.
 */
async function listSessions(userId, currentAccessJti) {
  if (!hasDatabase()) return [];
  const result = await db.query(
    `SELECT r.jti, r.user_agent, r.issued_at, a.last_activity AS access_activity, (a.jti = $2) AS is_current
       FROM auth_sessions r
       LEFT JOIN auth_sessions a ON a.jti = r.pair_jti AND a.kind = 'access'
      WHERE r.user_id = $1 AND r.kind = 'refresh' AND r.revoked = FALSE AND r.expires_at > NOW()
      ORDER BY (a.jti = $2) DESC NULLS LAST, COALESCE(a.last_activity, r.issued_at) DESC`,
    [userId, currentAccessJti || null]
  );
  return result.rows.map((row) => ({
    id: row.jti,
    userAgent: row.user_agent || null,
    createdAt: new Date(row.issued_at).toISOString(),
    lastActivity: new Date(row.access_activity || row.issued_at).toISOString(),
    current: Boolean(row.is_current),
  }));
}

/** Encerra uma sessao do usuario (refresh + access pareado). Retorna false se nao for dele. */
async function revokeSession(userId, refreshJti) {
  if (!hasDatabase() || !refreshJti) return false;
  const result = await db.query(
    "SELECT jti, pair_jti FROM auth_sessions WHERE jti = $1 AND user_id = $2 AND kind = 'refresh'",
    [refreshJti, userId]
  );
  const row = result.rows[0];
  if (!row) return false;
  await revoke("refresh", row.jti);
  if (row.pair_jti) await revoke("access", row.pair_jti);
  return true;
}

/** Encerra todas as sessoes do usuario, menos a atual (identificada pelo access jti). */
async function revokeOthers(userId, currentAccessJti) {
  if (!hasDatabase()) return 0;
  const result = await db.query(
    `SELECT jti, pair_jti FROM auth_sessions
      WHERE user_id = $1 AND kind = 'refresh' AND revoked = FALSE AND expires_at > NOW()
        AND pair_jti IS DISTINCT FROM $2`,
    [userId, currentAccessJti || null]
  );
  for (const row of result.rows) {
    await revoke("refresh", row.jti);
    if (row.pair_jti) await revoke("access", row.pair_jti);
  }
  return result.rows.length;
}

/** Logout: invalida tambem o refresh token pareado com o access token. */
async function revokePairedRefresh(accessJti) {
  const entry = await get("access", accessJti);
  if (entry && entry.pairJti) await revoke("refresh", entry.pairJti);
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
  listSessions,
  revokeSession,
  revokeOthers,
  revokePairedRefresh,
  touch,
  cleanupExpired,
};
