require('dotenv').config();
const request = require('supertest');

let baseUrl;
let adminEmail;
let adminPassword;

async function authenticate() {
  const res = await request(baseUrl)
    .post('/auth/login')
    .send({ email: adminEmail, password: adminPassword });

  if (res.status !== 200 || !res.body || !res.body.token) {
    throw new Error(`Falha ao autenticar no hook. status=${res.status}`);
  }

  global.authToken = res.body.token;
  process.env.TEST_JWT = global.authToken;
  global.api = request(baseUrl);
  global.withAuth = (req) => req.set('Authorization', `Bearer ${global.authToken}`);
}

before(async function authLoginHook() {
  this.timeout(15000);
  baseUrl = process.env.BASE_URL || 'http://localhost:3000/api';
  adminEmail = process.env.ADMIN_EMAIL;
  adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL/ADMIN_PASSWORD ausentes. Configure o .env.');
  }

  await authenticate();
});

afterEach(async function refreshTokenIfNeeded() {
  if (!this.currentTest) return;
  const title =
    typeof this.currentTest.fullTitle === 'function'
      ? this.currentTest.fullTitle()
      : this.currentTest.title || '';

  if (title.toLowerCase().includes('logout')) {
    await authenticate();
  }
});

after(async function authLogoutHook() {
  if (!global.api || !global.authToken) return;
  try {
    await global.api.post('/auth/logout').set('Authorization', `Bearer ${global.authToken}`);
  } catch (_) {
    // ignore logout errors
  }
});

