const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { failedAttempts } = require('../../src/models/db');

const AUTH = '/api/auth';
const PASSWORD = 'Senha@12345';

describe('US001 - Login por e-mail ou usuario', () => {
  let http;
  const stamp = Date.now().toString(36);
  const username = `user.${stamp}`;
  const email = `login-${stamp}@teste.com`;
  const email2 = `login2-${stamp}@teste.com`;

  const login = (body) => http.post(`${AUTH}/login`).set('Content-Type', 'application/json').send(body);

  before(async () => {
    http = getClient();
    const r = await http.post(`${AUTH}/register`).send({ email, password: PASSWORD, name: 'Com Usuario', username: username.toUpperCase() });
    expect(r.status, JSON.stringify(r.body)).to.equal(201);
    expect(r.body.user.username).to.equal(username);
    const r2 = await http.post(`${AUTH}/register`).send({ email: email2, password: PASSWORD, name: 'Sem Usuario' });
    expect(r2.status, JSON.stringify(r2.body)).to.equal(201);
    expect(r2.body.user.username).to.equal(null);
  });

  afterEach(() => failedAttempts.clear());

  it('LOGIN-USR-001 | Loga com e-mail pelo campo identifier', async () => {
    const r = await login({ identifier: email, password: PASSWORD });
    expect(r.status, JSON.stringify(r.body)).to.equal(200);
    expect(r.body.user.email).to.equal(email);
  });

  it('LOGIN-USR-002 | Loga com username (case-insensitive) pelo campo identifier', async () => {
    const r = await login({ identifier: username.toUpperCase(), password: PASSWORD });
    expect(r.status, JSON.stringify(r.body)).to.equal(200);
    expect(r.body.user.username).to.equal(username);
    expect(r.body.user.email).to.equal(email);
  });

  it('LOGIN-USR-003 | Campo legado email continua aceitando e-mail e username', async () => {
    expect((await login({ email, password: PASSWORD })).status).to.equal(200);
    expect((await login({ email: username, password: PASSWORD })).status).to.equal(200);
  });

  it('LOGIN-USR-004 | Mesma resposta para usuario inexistente e senha errada (sem enumeracao)', async () => {
    const naoExiste = await login({ identifier: `fantasma.${stamp}`, password: PASSWORD });
    const senhaErrada = await login({ identifier: username, password: 'Errada@123' });
    expect(naoExiste.status).to.equal(401);
    expect(senhaErrada.status).to.equal(401);
    expect(naoExiste.body.error).to.equal(senhaErrada.body.error);
  });

  it('LOGIN-USR-005 | Identificador invalido retorna 400', async () => {
    const r = await login({ identifier: 'a b', password: PASSWORD });
    expect(r.status).to.equal(400);
    expect(r.body.error).to.match(/e-mail ou usu/i);
    expect((await login({ identifier: 'ab', password: PASSWORD })).status).to.equal(400);
  });

  it('LOGIN-USR-006 | Bloqueio por tentativas vale para o username', async () => {
    let ultimo;
    for (let i = 0; i < 3; i += 1) {
      ultimo = await login({ identifier: username, password: 'Errada@123' });
    }
    expect(ultimo.status).to.equal(423);
    const certa = await login({ identifier: username, password: PASSWORD });
    expect(certa.status).to.equal(423);
  });

  it('LOGIN-USR-007 | Username duplicado (sem diferenciar maiusculas) retorna 409', async () => {
    const r = await http.post(`${AUTH}/register`).send({
      email: `dup-${stamp}@teste.com`,
      password: PASSWORD,
      name: 'Duplicado',
      username: username.toUpperCase(),
    });
    expect(r.status).to.equal(409);
    expect(r.body.code).to.equal('USERNAME_ALREADY_EXISTS');
  });

  it('LOGIN-USR-008 | Username com formato invalido no registro retorna 400', async () => {
    const r = await http.post(`${AUTH}/register`).send({
      email: `inv-${stamp}@teste.com`,
      password: PASSWORD,
      name: 'Invalido',
      username: 'a!',
    });
    expect(r.status).to.equal(400);
  });

  it('LOGIN-USR-009 | Perfil permite definir, trocar e remover username; duplicado retorna 409', async () => {
    const tk = (await login({ identifier: email2, password: PASSWORD })).body.token;
    const put = (b) => http.put(`${AUTH}/me`).set('Authorization', `Bearer ${tk}`).send(b);
    const novo = `novo.${stamp}`;

    let r = await put({ name: 'Sem Usuario', email: email2, username: novo });
    expect(r.status, JSON.stringify(r.body)).to.equal(200);
    expect(r.body.user.username).to.equal(novo);

    r = await put({ name: 'Sem Usuario', email: email2, username });
    expect(r.status).to.equal(409);

    r = await put({ name: 'Renomeado', email: email2 });
    expect(r.body.user.username).to.equal(novo);

    r = await put({ name: 'Renomeado', email: email2, username: '' });
    expect(r.status).to.equal(200);
    expect(r.body.user.username).to.equal(null);
  });
});
