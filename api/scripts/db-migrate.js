// Uso: node scripts/db-migrate.js [--status] [--env=test]
const envArg = process.argv.find((a) => a.startsWith("--env="));
if (envArg) process.env.NODE_ENV = envArg.slice("--env=".length);
require("../src/config/loadEnv");
const { pool } = require("../src/db");
const { runMigrations, getStatus } = require("../src/db/migrate");

(async () => {
  try {
    if (process.argv.includes("--status")) {
      console.table(await getStatus(pool));
    } else {
      const ran = await runMigrations(pool, { log: console.log });
      console.log(ran.length ? `${ran.length} migracao(oes) aplicada(s).` : "Nada a aplicar.");
    }
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();