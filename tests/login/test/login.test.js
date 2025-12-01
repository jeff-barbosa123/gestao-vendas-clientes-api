// test/login.test.js
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../../api/src/app');

const LOGIN_PATH = '/api/auth/login';

let http;
const ENV = {
  baseUrl: process.env.BASE_URL,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@negocio.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  blockedEmail: process.env.BLOCKED_USER_EMAIL || 'bloqueado@teste.com',
  blockedPassword: process.env.BLOCKED_USER_PASSWORD || '123456',
};

const MESSAGES = {
  invalidCredentials: 'Credenciais inválidas',
  invalidEmail: 'Formato de e-mail inválido',
  invalidPasswordType: 'Formato de senha inválido',
  emailRequired: 'E-mail é obrigatório',
  passwordRequired: 'Senha é obrigatória',
  emailPasswordRequired: 'E-mail e senha são obrigatórios',
  passwordShort: 'Senha muito curta',
  passwordLong: 'Senha muito longa',
  blockedUser: 'Usuário bloqueado',
};

async function postLogin(body, headers = {}) {
  return http.post(LOGIN_PATH).set(headers).send(body);
}

async function getLogin(headers = {}) {
  return http.get(LOGIN_PATH).set(headers);
}

describe('Login', () => {
  before(() => {
    http = ENV.baseUrl ? request(ENV.baseUrl) : request(app);
  });

  it('API-001 | Deve retornar 200 e um token em string quando usar credenciais válidas', async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: ENV.adminPassword,
    });

    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });

  it("API-002 | Deve retornar 401 e a mensagem 'Credenciais inválidas' quando a senha for incorreta", async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: 'senhaErrada',
    });

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal(MESSAGES.invalidCredentials);
  });

  it("API-003 | Deve retornar 401 e a mensagem 'Credenciais inválidas' quando o e-mail não estiver cadastrado", async () => {
    const resposta = await postLogin({
      email: 'naoexiste@teste.com',
      password: ENV.adminPassword,
    });

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal(MESSAGES.invalidCredentials);
  });

  it("API-004 | Deve retornar 400 e a mensagem 'Formato de e-mail inválido' quando o e-mail não tiver '@'", async () => {
    const resposta = await postLogin({
      email: 'emailinvalido.com',
      password: '123456',
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
  });

  it("API-005 | Deve retornar 400 e a mensagem 'Formato de e-mail inválido' quando o e-mail não tiver domínio", async () => {
    const resposta = await postLogin({
      email: 'email@invalido',
      password: '123456',
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
  });

  it("API-006 | Deve retornar 400 e a mensagem 'E-mail é obrigatório' quando o campo e-mail estiver vazio", async () => {
    const resposta = await postLogin({ email: '', password: '' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.emailRequired);
  });

  it("API-007 | Deve retornar 400 e a mensagem 'Senha é obrigatória' quando o campo senha estiver vazio", async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: '',
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.passwordRequired);
  });

  it('API-008 | Deve retornar 200 após aplicar trim() quando o e-mail tiver espaços antes ou depois', async () => {
    const resposta = await postLogin({
      email: `  ${ENV.adminEmail}  `,
      password: ENV.adminPassword,
    });

    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });

  it('API-009 | Deve retornar 200 após aplicar trim() quando a senha tiver espaços antes ou depois', async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: `  ${ENV.adminPassword}  `,
    });

    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });

  it("API-010 | Deve retornar 400 e a mensagem 'Formato de e-mail inválido' quando o e-mail for numérico", async () => {
    const resposta = await postLogin({ email: 999999999, password: 'admin123' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
  });

  it("API-011 | Deve retornar 400 e a mensagem 'Formato de e-mail inválido' quando o e-mail conter caracteres inválidos", async () => {
    const resposta = await postLogin({
      email: 'user!name@gmail.com',
      password: 'admin123',
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
  });

  it("API-012 | Deve retornar 400 e a mensagem 'Senha muito curta' quando a senha tiver menos caracteres que o mínimo permitido", async () => {
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

  it("API-014 | Deve retornar 400 e a mensagem 'E-mail e senha são obrigatórios' quando o payload estiver vazio", async () => {
    const resposta = await postLogin({});

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.emailPasswordRequired);
  });

  it("API-015 | Deve retornar 400 e a mensagem 'Formato de e-mail inválido' quando o e-mail não for uma string", async () => {
    const resposta = await postLogin({
      email: ['teste@gmail.com'],
      password: ENV.adminPassword,
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
  });

  it("API-016 | Deve retornar 400 e a mensagem 'Formato de senha inválido' quando a senha não for uma string", async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: ['admin123'],
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.invalidPasswordType);
  });

  it("API-017 | Deve retornar 400 e a mensagem 'E-mail é obrigatório' quando o campo e-mail não for enviado", async () => {
    const resposta = await postLogin({ password: ENV.adminPassword });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.emailRequired);
  });

  it("API-018 | Deve retornar 400 e a mensagem 'Senha é obrigatória' quando o campo senha não for enviado", async () => {
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

  it('API-020 | Deve autenticar corretamente quando o e-mail for enviado em letras maiúsculas', async () => {
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

  it("API-022 | Deve retornar 403 e a mensagem 'Usuário bloqueado' quando o usuário estiver bloqueado", async () => {
    const resposta = await postLogin({
      email: ENV.blockedEmail,
      password: ENV.blockedPassword,
    });

    expect(resposta.status).to.equal(403);
    expect(resposta.body.error).to.equal(MESSAGES.blockedUser);
  });

  it('API-023 | Deve retornar 429 após múltiplas tentativas inválidas de login', async () => {
    let resposta;

    for (let i = 0; i < 6; i++) {
      resposta = await postLogin({
        email: ENV.adminEmail,
        password: 'errada',
      });
    }

    expect(resposta.status).to.equal(429);
  });

  it("API-024 | Deve retornar 400 e a mensagem 'Senha é obrigatória' quando a senha for nula", async () => {
    const resposta = await postLogin({
      email: ENV.adminEmail,
      password: null,
    });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(MESSAGES.passwordRequired);
  });

  it("API-025 | Deve retornar 400 e a mensagem 'E-mail é obrigatório' quando o e-mail for nulo", async () => {
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

  it('API-027 | Deve retornar 415 quando o login for enviado com Content-Type inválido', async () => {
    const resposta = await postLogin(
      'email=admin@negocio.com&password=admin123',
      { 'Content-Type': 'text/plain' }
    );

    expect(resposta.status).to.equal(415);
  });
});
