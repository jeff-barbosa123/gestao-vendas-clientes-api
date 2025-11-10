require('dotenv').config();
const request = require('supertest');

let baseUrl;

before(async function authLoginHook() {
  this.timeout(15000);
  baseUrl = process.env.BASE_URL || 'http://localhost:3000/api';

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL/ADMIN_PASSWORD ausentes. Configure o .env.');
  }

  const res = await request(baseUrl)
    .post('/auth/login')
    .send({ email: adminEmail, password: adminPassword });

  if (res.status !== 200 || !res.body || !res.body.token) {
    throw new Error(`Falha ao autenticar no hook. status=${res.status}`);
  }

  global.authToken = res.body.token;
  global.api = request(baseUrl);
  global.withAuth = (req) => req.set('Authorization', `Bearer ${global.authToken}`);
});

after(async function authLogoutHook() {
  if (!global.api || !global.authToken) return;
  try {
    await global.api.post('/auth/logout').set('Authorization', `Bearer ${global.authToken}`);
  } catch (_) {
    // ignore logout errors
  }
});

