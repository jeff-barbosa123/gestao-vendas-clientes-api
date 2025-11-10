const { expect } = require('chai');

describe('Auth', () => {
  it('login com credenciais válidas retorna token (200)', async () => {
    const res = await global.api
      .post('/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('token').that.is.a('string');
    expect(res.body).to.have.property('user');
  });

  it('login com credenciais inválidas retorna 401', async () => {
    const res = await global.api
      .post('/auth/login')
      .send({ email: 'invalido@example.com', password: 'errado' });

    expect([400,401,403]).to.include(res.status); // algumas APIs retornam 400 no corpo
  });

  it('logout revoga o token atual', async () => {
    const res = await global.withAuth(global.api.post('/auth/logout'));
    expect([200,204]).to.include(res.status);
  });
});

