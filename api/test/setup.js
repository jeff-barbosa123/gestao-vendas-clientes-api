const path = require('path');
const dotenv = require('dotenv');
const chai = require('chai');
const chaiHttp = require('chai-http');

// Força carregar o .env da RAIZ do projeto (não de /test)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// (Opcional) logs de depuração — pode remover depois
console.log('✅ .env carregado de:', path.resolve(__dirname, '../.env'));
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);

// Configura o chai para usar chai-http
chai.use(chaiHttp);

global.chai = chai;
global.expect = chai.expect;

// Configurações globais para testes HTTP
const app = require('../src/app');
global.api = chai.request(app);
global.withAuth = (req) => req.set('Authorization', `Bearer ${process.env.TEST_JWT}`);