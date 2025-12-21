const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const LEVELS = ['error', 'warn', 'info', 'debug'];
const isTest = process.env.NODE_ENV === 'test';
const consoleLevel = process.env.CONSOLE_LOG_LEVEL || 'info';
const streams = {};

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function streamFor(channel) {
  if (streams[channel]) return streams[channel];
  ensureDir();
  const filename = {
    audit: 'audit.log',
    application: 'application.log',
    error: 'error.log',
  }[channel] || 'application.log';
  const filePath = path.join(LOG_DIR, filename);
  streams[channel] = fs.createWriteStream(filePath, { flags: 'a' });
  return streams[channel];
}

function shouldConsole(level) {
  if (isTest) return false;
  return LEVELS.indexOf(level) <= LEVELS.indexOf(consoleLevel);
}

function log(channel, level, payload) {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    origin: 'API',
    ...payload,
  };
  const line = JSON.stringify(entry);

  // Escreve em arquivo específico do canal
  streamFor(channel).write(`${line}\n`);

  // Opcionalmente, ecoa no console (exceto em ambiente de teste)
  if (shouldConsole(level)) {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

function logInfo(payload) {
  log('application', 'info', payload);
}

function logError(payload) {
  log('error', 'error', payload);
}

function logAudit(payload) {
  log('audit', 'info', payload);
}

module.exports = { logInfo, logError, logAudit };
