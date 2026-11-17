// Runner de migracoes versionadas (SQL puro).
// - schema.sql continua sendo o baseline idempotente (aplicado antes);
// - cada arquivo src/db/migrations/NNNN_nome.sql roda uma unica vez, em ordem, em transacao;
// - historico em schema_migrations (version, name, checksum, applied_at);
// - advisory lock evita execucao concorrente (varias instancias subindo juntas);
// - alterar uma migracao ja aplicada falha (checksum diferente): crie uma nova.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const LOCK_KEY = 727001;

function listMigrationFiles(dir = MIGRATIONS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()
    .map((file) => {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      return {
        version: file.slice(0, 4),
        name: file.replace(/\.sql$/, ""),
        sql,
        checksum: crypto.createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex"),
      };
    });
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
}

async function getStatus(pool, dir) {
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const { rows } = await client.query("SELECT version, checksum, applied_at FROM schema_migrations");
    const applied = new Map(rows.map((r) => [r.version, r]));
    return listMigrationFiles(dir).map((m) => ({
      version: m.version,
      name: m.name,
      applied: applied.has(m.version),
      appliedAt: applied.get(m.version)?.applied_at || null,
      checksumMismatch: applied.has(m.version) && applied.get(m.version).checksum !== m.checksum,
    }));
  } finally {
    client.release();
  }
}

async function runMigrations(pool, { dir, log = () => {} } = {}) {
  const client = await pool.connect();
  const ran = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    await ensureTable(client);
    const { rows } = await client.query("SELECT version, checksum FROM schema_migrations");
    const applied = new Map(rows.map((r) => [r.version, r.checksum]));

    for (const m of listMigrationFiles(dir)) {
      if (applied.has(m.version)) {
        if (applied.get(m.version) !== m.checksum) {
          throw new Error(`Migracao ${m.name} ja aplicada foi alterada (checksum difere). Crie uma nova migracao.`);
        }
        continue;
      }
      try {
        await client.query("BEGIN");
        await client.query(m.sql);
        await client.query(
          "INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
          [m.version, m.name, m.checksum]
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw new Error(`Falha na migracao ${m.name}: ${err.message}`);
      }
      log(`Migracao aplicada: ${m.name}`);
      ran.push(m.name);
    }
    return ran;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
    client.release();
  }
}

module.exports = { runMigrations, getStatus, listMigrationFiles, MIGRATIONS_DIR };