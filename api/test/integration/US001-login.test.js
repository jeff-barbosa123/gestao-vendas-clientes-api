// api/test/integration/login.test.js
const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const { getClient } = require('../utils/httpClient');
const { failedAttempts, tokenStore } = require('../../src/models/db');

const LOGIN_PATH = '/api/auth/login';
const ME_PATH = '/api/auth/me';
const VALIDATE_PATH = '/api/auth/validate';

const ENV = {
  baseUrl: process.env.BASE_URL,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@negocio.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  blockedEmail: process.env.BLOCKED_USER_EMAIL || 'bloqueado@teste.com',
  blockedPassword: process.env.BLOCKED_USER_PASSWORD || '123456',
};

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const MESSAGES = {
  invalidCredentials: 'Credenciais inv\u00e1lidos',
  invalidEmail: 'Formato de e-mail inv\u00e1lido',
  invalidPasswordType: 'Formato de senha inv\u00e1lido',
  emailRequired: 'E-mail \u00e9 obrigat\u00f3rio',
  passwordRequired: 'Senha \u00e9 obrigat\u00f3ria',
  emailPasswordRequired: 'E-mail e senha s\u00e3o obrigat\u00f3rios',
  passwordShort: 'Senha muito curta',
  passwordLong: 'Senha muito longa',
  blockedUser: 'Usu\u00e1rio bloqueado',
  accessBlocked: 'Acesso temporariamente bloqueado',
  forbidden: 'Acesso negado',
  sessionExpired: 'Sess\u00e3o expirada, fa\u00e7a login novamente',
};

describe('Login', () => {
  let http;

  before(() => {
    http = getClient();
  });

  afterEach(() => {
    failedAttempts.clear();
    tokenStore.clear();
  });

  const postLogin = (body, headers = {}) => http.post(LOGIN_PATH).set(headers).send(body);
  const getLogin = (headers = {}) => http.get(LOGIN_PATH).set(headers);

  const loginAndGetToken = async () => {
    const resposta = await postLogin({ email: ENV.adminEmail, password: ENV.adminPassword });
    return resposta.body.token;
  };

  it('API-001 | Deve retornar 200 e um token em string quando usar credenciais v\u00e1lidas', async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: ENV.adminPassword,
    });

    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });

  it("API-002 | Deve retornar 401 e a mensagem 'Credenciais inv\u00e1lidos' quando a senha for incorreta", async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: 'senhaErrada',
    });

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal(MESSAGES.invalidCredentials);
  });

  it("API-003 | Deve retornar 401 e a mensagem 'Credenciais inv\u00e1lidos' quando o e-mail n\u00e3o estiver cadastrado", async () => {
    const resposta = await postLogin({
      email: 'naoexiste@teste.com',
      password: ENV.adminPassword,
    });

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal(MESSAGES.invalidCredentials);
  });

  it("API-004 | Deve retornar 400 e a mensagem 'Formato de e-mail inv\u00e1lido' quando o e-mail n\u00e3o tiver '@'", async () => {
    const resposta = await postLogin({
      email: 'emailinvalido.com',
      password: '123456',
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
  });

  it("API-005 | Deve retornar 400 e a mensagem 'Formato de e-mail inv\u00e1lido' quando o e-mail n\u00e3o tiver dom\u00ednio", async () => {
    const resposta = await postLogin({
      email: 'email@invalido',
      password: '123456',
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
  });

  it("API-006 | Deve retornar 400 e a mensagem 'E-mail \u00e9 obrigat\u00f3rio' quando o campo e-mail estiver vazio", async () => {
    const resposta = await postLogin({ email: '', password: '' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.emailRequired);
  });

  it("API-007 | Deve retornar 400 e a mensagem 'Senha \u00e9 obrigat\u00f3ria' quando o campo senha estiver vazio", async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: '',
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.passwordRequired);
  });

  it('API-008 | Deve retornar 200 ap\u00f3s aplicar trim() quando o e-mail tiver espa\u00e7os antes ou depois', async () => {
    const resposta = await postLogin({
      email: `  ${ENV.adminEmail}  `,
      password: ENV.adminPassword,
    });

    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });

  it('API-009 | Deve retornar 200 ap\u00f3s aplicar trim() quando a senha tiver espa\u00e7os antes ou depois', async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: `  ${ENV.adminPassword}  `,
    });

    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });

  it("API-010 | Deve retornar 400 e a mensagem 'Formato de e-mail inv\u00e1lido' quando o e-mail for num\u00e9rico", async () => {
    const resposta = await postLogin({ email: 999999999, password: 'admin123' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
  });

  it("API-011 | Deve retornar 400 e a mensagem 'Formato de e-mail inv\u00e1lido' quando o e-mail conter caracteres inv\u00e1lidos", async () => {
    const resposta = await postLogin({
      email: 'user!name@gmail.com',
      password: 'admin123',
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
  });

  it("API-012 | Deve retornar 400 e a mensagem 'Senha muito curta' quando a senha tiver menos caracteres que o m\u00ednimo permitido", async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: '12',
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.passwordShort);
  });

  it("API-013 | Deve retornar 400 e a mensagem 'Senha muito longa' quando a senha exceder o limite permitido", async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: '1'.repeat(50),
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.passwordLong);
  });

  it("API-014 | Deve retornar 400 e a mensagem 'E-mail e senha s\u00e3o obrigat\u00f3rios' quando o payload estiver vazio", async () => {
    const resposta = await postLogin({});

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.emailPasswordRequired);
  });

  it("API-015 | Deve retornar 400 e a mensagem 'Formato de e-mail inv\u00e1lido' quando o e-mail n\u00e3o for uma string", async () => {
    const resposta = await postLogin({
      email: ['teste@gmail.com'],
      password: ENV.adminPassword,
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
  });

  it("API-016 | Deve retornar 400 e a mensagem 'Formato de senha inv\u00e1lido' quando a senha n\u00e3o for uma string", async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: ['admin123'],
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidPasswordType);
  });

  it("API-017 | Deve retornar 400 e a mensagem 'E-mail \u00e9 obrigat\u00f3rio' quando o campo e-mail n\u00e3o for enviado", async () => {
    const resposta = await postLogin({ password: ENV.adminPassword });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.emailRequired);
  });

  it("API-018 | Deve retornar 400 e a mensagem 'Senha \u00e9 obrigat\u00f3ria' quando o campo senha n\u00e3o for enviado", async () => {
    const resposta = await postLogin({ email: ENV.adminEmail });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.passwordRequired);
  });

  it('API-019 | Deve ignorar campos adicionais e autenticar normalmente quando forem enviados campos extras', async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: ENV.adminPassword,
      extra1: 'teste',
      extra2: 999,
    });

    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });

  it('API-020 | Deve autenticar corretamente quando o e-mail for enviado em letras mai\u00fasculas', async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail.toUpperCase(),
      password: ENV.adminPassword,
    });

    expect(resposta.status).to.equal(200);
  });

  it('API-021 | Deve autenticar corretamente quando a senha possuir caracteres especiais permitidos', async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: 'Admin@123!',
    });

    expect(resposta.status).to.equal(200);
  });

  it("API-022 | Deve retornar 403 e a mensagem 'Usu\u00e1rio bloqueado' quando o usu\u00e1rio estiver bloqueado", async () => {
    const resposta = await postLogin({
      email: ENV.blockedEmail,
      password: ENV.blockedPassword,
    });

    expect(resposta.status).to.equal(403);
    expect(resposta.body.error).to.equal(MESSAGES.blockedUser);
  });

  it('API-023 | Deve retornar 423 ap\u00f3s 3 tentativas inv\u00e1lidas de login', async () => {
    let resposta;

    for (let i = 0; i < 3; i++) {
      resposta = await postLogin({
        email: ENV.adminEmail,
        password: 'errada',
      });
    }

    expect(resposta.status).to.equal(423);
    expect(resposta.body.error).to.equal(MESSAGES.accessBlocked);
  });

  it("API-024 | Deve retornar 400 e a mensagem 'Senha \u00e9 obrigat\u00f3ria' quando a senha for nula", async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: null,
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.passwordRequired);
  });

  it("API-025 | Deve retornar 400 e a mensagem 'E-mail \u00e9 obrigat\u00f3rio' quando o e-mail for nulo", async () => {
    const resposta = await postLogin({
      email: null,
      password: ENV.adminPassword,
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.emailRequired);
  });

  it('API-026 | Deve retornar 405 quando tentar acessar o endpoint de login com GET', async () => {
    const resposta = await getLogin();
    expect(resposta.status).to.equal(405);
  });

  it('API-027 | Deve retornar 415 quando o login for enviado com Content-Type inv\u00e1lido', async () => {
    const resposta = await postLogin(
      'email=admin@negocio.com&password=admin123',
      { 'Content-Type': 'text/plain' }
    );

    expect(resposta.status).to.equal(415);
  });

  it('API-028 | Deve retornar 403 quando acessar rota protegida sem token', async () => {
    const resposta = await http.get('/api/customers');
    expect(resposta.status).to.equal(403);
    expect(resposta.body.error).to.equal(MESSAGES.forbidden);
  });

  it('API-029 | Deve retornar 401 quando o token for inv\u00e1lido', async () => {
    const resposta = await http
      .get('/api/customers')
      .set('Authorization', 'Bearer token-invalido');

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal(MESSAGES.forbidden);
  });

  it('API-030 | Deve retornar 401 e mensagem de sess\u00e3o expirada para token expirado', async () => {
    const expiredToken = jwt.sign(
      { sub: 'u1', email: ENV.adminEmail, jti: 'expired-token' },
      JWT_SECRET,
      { expiresIn: -10 }
    );

    const resposta = await http
      .get('/api/customers')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal(MESSAGES.sessionExpired);
  });

  it('API-031 | Deve encerrar sess\u00e3o por inatividade ap\u00f3s 30 minutos', async () => {
    const token = await loginAndGetToken();
    const decoded = jwt.decode(token);
    const entry = tokenStore.get(decoded.jti);
    entry.lastActivity = Date.now() - 31 * 60 * 1000;

    const resposta = await http
      .get('/api/customers')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal(MESSAGES.sessionExpired);
  });

  it('API-032 | Deve retornar dados do usu\u00e1rio autenticado em /auth/me', async () => {
    const token = await loginAndGetToken();

    const resposta = await http
      .get(ME_PATH)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).to.equal(200);
    expect(resposta.body.user.email.toLowerCase()).to.equal(ENV.adminEmail.toLowerCase());
  });

  it('API-033 | Deve validar token ativo em /auth/validate', async () => {
    const token = await loginAndGetToken();

    const resposta = await http
      .get(VALIDATE_PATH)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).to.equal(200);
    expect(resposta.body.valid).to.equal(true);
  });

  it('API-034 | Deve revogar o token ap\u00f3s logout', async () => {
    const token = await loginAndGetToken();

    const logoutResp = await http
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutResp.status).to.equal(204);

    const meResp = await http
      .get(ME_PATH)
      .set('Authorization', `Bearer ${token}`);

    expect(meResp.status).to.equal(401);
    expect(meResp.body.error).to.equal(MESSAGES.forbidden);
  });

it('API-035 | Deve retornar 403 ao tentar realizar logout sem token', async () => {
  const resposta = await http.post('/api/auth/logout');

  expect(resposta.status).to.equal(403);
  expect(resposta.body.error).to.equal(MESSAGES.forbidden);
});



it('API-036 | Deve retornar 401 ao tentar realizar logout com token inválido', async () => {
  const resposta = await http
    .post('/api/auth/logout')
    .set('Authorization', 'Bearer token-invalido');

  expect(resposta.status).to.equal(401);
  expect(resposta.body.error).to.equal(MESSAGES.forbidden);
});


it('API-037 | Deve impedir reutilização do token após logout', async () => {
  const token = await loginAndGetToken();

  await http
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);

  const resposta = await http
    .get('/api/customers')
    .set('Authorization', `Bearer ${token}`);

  expect(resposta.status).to.equal(401);
  expect(resposta.body.error).to.equal(MESSAGES.forbidden);
});


it('API-038 | Deve retornar sucesso ao realizar logout duas vezes com o mesmo token', async () => {
  const token = await loginAndGetToken();

  const firstLogout = await http
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);

  expect(firstLogout.status).to.equal(204);

  const secondLogout = await http
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);

  expect(secondLogout.status).to.be.oneOf([204, 401]);
});


it('API-039 | Deve retornar token inválido em /auth/validate após logout', async () => {
  const token = await loginAndGetToken();

  await http
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);

  const resposta = await http
    .get(VALIDATE_PATH)
    .set('Authorization', `Bearer ${token}`);

  expect(resposta.status).to.equal(401);
});


it('API-040 | Deve invalidar token expirado mesmo sem logout explícito', async () => {
  const expiredToken = jwt.sign(
    { sub: 'u1', email: ENV.adminEmail },
    JWT_SECRET,
    { expiresIn: -1 }
  );

  const resposta = await http
    .get('/api/customers')
    .set('Authorization', `Bearer ${expiredToken}`);

  expect(resposta.status).to.equal(401);
});

});
