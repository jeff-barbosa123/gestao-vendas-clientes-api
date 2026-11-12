// Uso:
//   node scripts/db-init.js           -> aplica o schema.sql (idempotente)
//   node scripts/db-init.js --reset   -> apaga tudo e recria do zero (só fora de produção)

// --env=<nome> escolhe o ambiente (ex.: --env=test carrega .env.test), igual em qualquer shell
const envArg = process.argv.find((a) => a.startsWith("--env="));
if (envArg) process.env.NODE_ENV = envArg.slice("--env=".length);

require("../src/config/loadEnv");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const schemaPath = path.resolve(__dirname, "../src/db/schema.sql");

async function main() {
  const reset = process.argv.includes("--reset");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurado.");
  }

  if (reset && process.env.NODE_ENV === "production") {
    throw new Error("--reset é proibido em produção.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    if (reset) {
      await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
      console.log("Schema public recriado (dados apagados).");
    }

    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await pool.query(schemaSql);
    console.log("schema.sql aplicado com sucesso.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
console.error("ERRO COMPLETO AO INICIALIZAR:", err);
  process.exit(1);
});