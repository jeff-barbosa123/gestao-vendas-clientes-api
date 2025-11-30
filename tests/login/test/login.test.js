// test/login.test.js
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../../api/src/app');

describe('Login', () => {

  // API-001 – Login válido
  it("Deve retornar 200 e um token em string quando usar credenciais válidas", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@negocio.com', password: 'admin123' });

    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });

  // API-002 – Senha incorreta
  it("Deve retornar 401 e a mensagem 'Credenciais inválidas' quando a senha for incorreta", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@negocio.com', password: 'senhaErrada' });

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal('Credenciais inválidas');
  });

  // API-003 – E-mail inexistente
  it("Deve retornar 401 e a mensagem 'Credenciais inválidas' quando o e-mail não estiver cadastrado", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'naoexiste@teste.com', password: 'admin123' });

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal('Credenciais inválidas');
  });

  // API-004 – E-mail sem @
  it("Deve retornar 400 e a mensagem 'Formato de e-mail inválido' quando o e-mail não tiver '@'", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'emailinvalido.com', password: '123456' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('Formato de e-mail inválido');
  });

  // API-005 – E-mail sem domínio
  it("Deve retornar 400 e a mensagem 'Formato de e-mail inválido' quando o e-mail não tiver domínio", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'email@invalido', password: '123456' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('Formato de e-mail inválido');
  });

  // API-006 – Campo e-mail vazio
  it("Deve retornar 400 e a mensagem 'E-mail é obrigatório' quando o campo e-mail estiver vazio", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: '' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('E-mail é obrigatório');
  });

  // API-007 – Campo senha vazio
  it("Deve retornar 400 e a mensagem 'Senha é obrigatória' quando o campo senha estiver vazio", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@negocio.com', password: '' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('Senha é obrigatória');
  });

  // API-008 – E-mail com espaços
  it("Deve retornar 200 após aplicar trim() quando o e-mail tiver espaços antes ou depois", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: '  admin@negocio.com  ', password: 'admin123' });

    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });

  // API-009 – Senha com espaços
  it("Deve retornar 200 após aplicar trim() quando a senha tiver espaços antes ou depois", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@negocio.com', password: '  admin123  ' });

    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });

  // API-010 – E-mail numérico
  it("Deve retornar 400 e a mensagem 'Formato de e-mail inválido' quando o e-mail for numérico", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 999999999, password: 'admin123' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('Formato de e-mail inválido');
  });

  // API-011 – E-mail com caracteres inválidos
  it("Deve retornar 400 e a mensagem 'Formato de e-mail inválido' quando o e-mail conter caracteres inválidos", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user!name@gmail.com', password: 'admin123' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('Formato de e-mail inválido');
  });

  // API-012 – Senha curta
  it("Deve retornar 400 e a mensagem 'Senha muito curta' quando a senha tiver menos caracteres que o mínimo permitido", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@negocio.com', password: '12' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('Senha muito curta');
  });

  // API-013 – Senha longa
  it("Deve retornar 400 e a mensagem 'Senha muito longa' quando a senha exceder o limite permitido", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@negocio.com', password: '1'.repeat(50) });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('Senha muito longa');
  });

  // API-014 – Payload vazio
  it("Deve retornar 400 e a mensagem 'E-mail e senha são obrigatórios' quando o payload estiver vazio", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('E-mail e senha são obrigatórios');
  });

  // API-015 – E-mail não string
  it("Deve retornar 400 e a mensagem 'Formato de e-mail inválido' quando o e-mail não for uma string", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: ["teste@gmail.com"], password: 'admin123' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('Formato de e-mail inválido');
  });

  // API-016 – Senha não string
  it("Deve retornar 400 e a mensagem 'Formato de senha inválido' quando a senha não for uma string", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@negocio.com', password: ["admin123"] });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('Formato de senha inválido');
  });

  // API-017 – Campo e-mail faltando
  it("Deve retornar 400 e a mensagem 'E-mail é obrigatório' quando o campo e-mail não for enviado", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ password: 'admin123' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('E-mail é obrigatório');
  });

  // API-018 – Campo senha faltando
  it("Deve retornar 400 e a mensagem 'Senha é obrigatória' quando o campo senha não for enviado", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@negocio.com' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('Senha é obrigatória');
  });

  // API-019 – Campos inesperados
  it("Deve ignorar campos adicionais e autenticar normalmente quando forem enviados campos extras", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@negocio.com',
        password: 'admin123',
        extra1: 'teste',
        extra2: 999
      });

    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });

  // API-020 – E-mail maiúsculo
  it("Deve autenticar corretamente quando o e-mail for enviado em letras maiúsculas", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ADMIN@NEGOCIO.COM', password: 'admin123' });

    expect(resposta.status).to.equal(200);
  });

  // API-021 – Senha com caracteres especiais
  it("Deve autenticar corretamente quando a senha possuir caracteres especiais permitidos", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@negocio.com', password: 'Admin@123!' });

    expect(resposta.status).to.equal(200);
  });

  // API-022 – Usuário bloqueado
  it("Deve retornar 403 e a mensagem 'Usuário bloqueado' quando o usuário estiver bloqueado", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bloqueado@teste.com', password: '123456' });

    expect(resposta.status).to.equal(403);
    expect(resposta.body.error).to.equal('Usuário bloqueado');
  });

  // API-023 – Rate limit
  it("Deve retornar 429 após múltiplas tentativas inválidas de login", async () => {
    let resposta;

    for (let i = 0; i < 6; i++) {
      resposta = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@negocio.com', password: 'errada' });
    }

    expect(resposta.status).to.equal(429);
  });

  // API-024 – Senha nula
  it("Deve retornar 400 e a mensagem 'Senha é obrigatória' quando a senha for nula", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@negocio.com', password: null });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('Senha é obrigatória');
  });

  // API-025 – E-mail nulo
  it("Deve retornar 400 e a mensagem 'E-mail é obrigatório' quando o e-mail for nulo", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: null, password: 'admin123' });

    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal('E-mail é obrigatório');
  });

  // API-026 – Método GET
  it("Deve retornar 405 quando tentar acessar o endpoint de login com GET", async () => {
    const resposta = await request(app)
      .get('/api/auth/login');

    expect(resposta.status).to.equal(405);
  });

  // API-027 – Content-Type inválido
  it("Deve retornar 415 quando o login for enviado com Content-Type inválido", async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'text/plain')
      .send("email=admin@negocio.com&password=admin123");

    expect(resposta.status).to.equal(415);
  });

});
