/**
 * Script para iniciar a aplicação com ambiente específico
 * Uso: node scripts/start-env.js [local|hmg|production]
 * 
 * Compatível com Windows e Linux/Mac
 */

const { spawn } = require('child_process');
const path = require('path');

const ENV = process.argv[2] || 'local';
const MODE = process.argv[3] || 'start'; // start ou dev

const envMap = {
  local: { nodeEnv: 'development', envFile: '.env.local' },
  hmg: { nodeEnv: 'staging', envFile: '.env.hmg' },
  production: { nodeEnv: 'production', envFile: '.env.production' },
  prod: { nodeEnv: 'production', envFile: '.env.production' },
};

const config = envMap[ENV.toLowerCase()];

if (!config) {
  console.error(`❌ Ambiente inválido: ${ENV}`);
  console.error('Ambientes disponíveis: local, hmg, production');
  process.exit(1);
}

const isDev = MODE === 'dev' || MODE === 'development';
const command = isDev ? 'nodemon' : 'node';
const scriptPath = path.join(__dirname, '..', 'src', 'server.js');

// Configurar variáveis de ambiente
process.env.NODE_ENV = config.nodeEnv;
process.env.ENV_FILE = config.envFile;

console.log(`🚀 Iniciando aplicação...`);
console.log(`📦 Ambiente: ${ENV.toUpperCase()}`);
console.log(`🔧 NODE_ENV: ${config.nodeEnv}`);
console.log(`📄 ENV_FILE: ${config.envFile}`);
console.log(`⚙️  Modo: ${isDev ? 'Desenvolvimento (nodemon)' : 'Produção (node)'}`);
console.log('');

// Iniciar processo
const envVars = Object.assign({}, process.env, {
  NODE_ENV: config.nodeEnv,
  ENV_FILE: config.envFile,
});

const child = spawn(command, [scriptPath], {
  stdio: 'inherit',
  shell: true,
  env: envVars,
});

child.on('error', (error) => {
  console.error(`❌ Erro ao iniciar:`, error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
