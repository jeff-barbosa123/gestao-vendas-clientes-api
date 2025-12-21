// api/test/utils/authHelper.js
const { getClient } = require('./httpClient');

const LOGIN_PATH = '/api/auth/login';

const USERS = {
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@negocio.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
  other: {
    email: process.env.OTHER_USER_EMAIL || 'user@negocio.com',
    password: process.env.OTHER_USER_PASSWORD || 'user123',
  },
  blocked: {
    email: process.env.BLOCKED_USER_EMAIL || 'bloqueado@teste.com',
    password: process.env.BLOCKED_USER_PASSWORD || '123456',
  },
};

const loginAndGetToken = async (user = 'admin') => {
  const credentials = typeof user === 'string' ? USERS[user] : user;
  if (!credentials || !credentials.email || !credentials.password) {
    throw new Error('Credenciais invalidas');
  }
  const client = getClient();
  const resp = await client.post(LOGIN_PATH).send({
    email: credentials.email,
    password: credentials.password,
  });
  return resp.body.token;
};

const loginAndGetSession = async (user = 'admin') => {
  const credentials = typeof user === 'string' ? USERS[user] : user;
  if (!credentials || !credentials.email || !credentials.password) {
    throw new Error('Credenciais invalidas');
  }
  const client = getClient();
  const resp = await client.post(LOGIN_PATH).send({
    email: credentials.email,
    password: credentials.password,
  });
  return { token: resp.body.token, user: resp.body.user };
};

module.exports = { loginAndGetToken, loginAndGetSession, USERS };
