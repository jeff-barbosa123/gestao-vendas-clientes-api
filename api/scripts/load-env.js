/**
 * Script helper para carregar variáveis de ambiente por ambiente
 * Uso: node scripts/load-env.js local|hmg|production
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ENV = process.argv[2] || 'local';

const envFiles = {
  local: '.env.local',
  hmg: '.env.hmg',
  production: '.env.production',
  prod: '.env.production',
};

const envFile = envFiles[ENV.toLowerCase()];
const envPath = path.join(__dirname, '..', envFile);

if (!envFile) {
  console.error(`❌ Ambiente inválido: ${ENV}`);
  console.error('Ambientes disponíveis: local, hmg, production');
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  console.error(`❌ Arquivo de ambiente não encontrado: ${envFile}`);
  console.error(`Caminho esperado: ${envPath}`);
  console.error(`\n💡 Dica: Copie o arquivo de exemplo:`);
  console.error(`   cp ${envFile.replace('.env', 'env')}.example ${envFile}`);
  process.exit(1);
}

// Carregar variáveis de ambiente do arquivo
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`❌ Erro ao carregar ${envFile}:`, result.error);
  process.exit(1);
}

console.log(`✅ Ambiente carregado: ${ENV.toUpperCase()}`);
console.log(`📄 Arquivo: ${envFile}`);
console.log(`🔑 NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
console.log(`🌐 PORT: ${process.env.PORT || '3000'}`);
console.log(`🔐 JWT_SECRET: ${process.env.JWT_SECRET ? '✓ configurado' : '✗ não configurado'}`);
console.log(`🗄️  DATABASE_URL: ${process.env.DATABASE_URL ? '✓ configurado' : '✗ não configurado (usará banco em memória)'}`);

// Exportar variáveis para uso
module.exports = {
  ENV: ENV.toLowerCase(),
  envFile,
  envPath,
  variables: process.env,
};
