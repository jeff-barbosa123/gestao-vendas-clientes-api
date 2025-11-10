const path = require('path');
const dotenv = require('dotenv');

// Força carregar o .env da RAIZ do projeto (não de /test)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// (Opcional) logs de depuração — pode remover depois
console.log('✅ .env carregado de:', path.resolve(__dirname, '../.env'));
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);