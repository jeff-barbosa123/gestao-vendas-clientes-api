const path = require('path');
const Module = require('module');
const dotenv = require('dotenv');
const chai = require('chai');
const chaiHttp = require('chai-http');

// Ambiente de teste (força NODE_ENV=test para silenciar console nos loggers)
process.env.NODE_ENV = 'test';

// Allow tests outside api/ to resolve dev deps from api/node_modules (e.g., supertest)
const apiNodeModules = path.join(__dirname, '..', 'node_modules');
process.env.NODE_PATH = [apiNodeModules, process.env.NODE_PATH || '']
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

// Load .env from api root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Chai setup
chai.use(chaiHttp);
global.chai = chai;
global.expect = chai.expect;

// Global HTTP client
const app = require('../src/app');
global.api = chai.request(app);
global.withAuth = (req) => req.set('Authorization', `Bearer ${process.env.TEST_JWT}`);
