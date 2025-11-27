// test/login.test.js
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../api/src/app'); // sobe dois níveis até a raiz e entra em api/src/app

describe('Login', () => {
  it('Deve retornar 200 com um token em string quando usar credenciais válidas', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@negocio.com', password: 'admin123' });


      console.log(resposta.body);
      console.log(resposta.status);
    expect(resposta.status).to.equal(200);
    expect(resposta.body.token).to.be.a('string');
  });
});
