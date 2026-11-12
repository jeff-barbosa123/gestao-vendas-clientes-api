// Carrega as variáveis de ambiente conforme NODE_ENV (ou ENV_FILE).
// Usado pela API e pelos scripts (seed, migrações), para que todos leiam o mesmo arquivo.
// Idempotente: pode ser chamado várias vezes.
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

if (!global.__SGVC_ENV_LOADED__) {
  global.__SGVC_ENV_LOADED__ = true;

  const env = process.env.NODE_ENV || "development";
  let envFile;
  if (process.env.ENV_FILE) {
    envFile = process.env.ENV_FILE;
  } else if (env === "production") {
    envFile = ".env.production";
  } else if (env === "staging" || env === "hmg") {
    envFile = ".env.hmg";
  } else if (env === "test") {
    // Testes usam banco próprio: nunca carregar o .env.local (banco de desenvolvimento)
    envFile = ".env.test";
  } else {
    envFile = ".env.local";
  }

  const apiRoot = path.join(__dirname, "..", "..");
  const envPath = path.join(apiRoot, envFile);
  const defaultEnvPath = path.join(apiRoot, ".env");
  const quiet = env === "test";

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    if (!quiet) console.log(`📄 Ambiente carregado de: ${envFile}`);
  } else if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath });
    if (!quiet) console.log("📄 Ambiente carregado de: .env (padrão)");
  } else if (!quiet) {
    console.warn("⚠️  Nenhum arquivo .env encontrado. Usando variáveis de ambiente do sistema.");
    console.warn("💡 Dica: copie um arquivo de exemplo (env.local.example, env.test.example, env.hmg.example ou env.production.example).");
  }
}

module.exports = {};
