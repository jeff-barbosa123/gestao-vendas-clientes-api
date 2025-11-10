const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

const productsFixture = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'fixtures', 'products.json'), 'utf8'));

describe('Produtos', () => {
  let created = [];

  it('lista produtos exige autenticação (401)', async () => {
    const res = await global.api.get('/products');
    expect(res.status).to.equal(401);
  });

  it('cria produtos válidos (201)', async () => {
    for (const base of productsFixture) {
      // evitar conflito por nome duplicado em algumas implementações
      const payload = { ...base, name: `${base.name} ${Date.now()}` };
      const res = await global.withAuth(global.api.post('/products')).send(payload);
      expect(res.status).to.equal(201);
      expect(res.body).to.include.keys(['id','name','price']);
      created.push(res.body);
    }
  });

  it('lista produtos autenticado (200)', async () => {
    const res = await global.withAuth(global.api.get('/products'));
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  it('busca produto por id (200)', async () => {
    const id = created[0].id || created[0]._id || created[0].uuid;
    const res = await global.withAuth(global.api.get(`/products/${id}`));
    expect([200,204]).to.include(res.status);
  });

  it('atualiza produto (200)', async () => {
    const id = created[0].id || created[0]._id || created[0].uuid;
    const res = await global.withAuth(global.api.put(`/products/${id}`)).send({ price: 99.9 });
    expect([200,204]).to.include(res.status);
  });

  it('remove produto (200)', async () => {
    const toDelete = created.pop();
    const id = toDelete.id || toDelete._id || toDelete.uuid;
    const res = await global.withAuth(global.api.delete(`/products/${id}`));
    expect([200,204]).to.include(res.status);
  });
});

