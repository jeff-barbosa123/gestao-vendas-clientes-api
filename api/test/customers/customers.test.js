const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

const customersFixture = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'fixtures', 'customers.json'), 'utf8'));

describe('Clientes', () => {
  let created = [];

  it('lista clientes exige autenticação (401)', async () => {
    const res = await global.api.get('/customers');
    expect(res.status).to.equal(401);
  });

  it('cria clientes válidos (201)', async () => {
    for (const base of customersFixture) {
      const uniqueEmail = base.email.replace('@', `+${Date.now()}@`);
      const payload = { ...base, email: uniqueEmail };
      const res = await global.withAuth(global.api.post('/customers')).send(payload);
      expect(res.status).to.equal(201);
      expect(res.body).to.include.keys(['id','name','email']);
      created.push(res.body);
    }
  });

  it('não permite duplicidade de e-mail (409)', async () => {
    const sample = created[0];
    const res = await global.withAuth(global.api.post('/customers')).send({ name: 'Dup', email: sample.email, phone: '11999999999' });
    expect([400,409]).to.include(res.status);
  });

  it('lista clientes autenticado (200)', async () => {
    const res = await global.withAuth(global.api.get('/customers'));
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  it('busca cliente por id (200)', async () => {
    const id = created[0].id || created[0]._id || created[0].uuid;
    const res = await global.withAuth(global.api.get(`/customers/${id}`));
    expect([200,204]).to.include(res.status);
  });

  it('atualiza cliente (200)', async () => {
    const id = created[0].id || created[0]._id || created[0].uuid;
    const res = await global.withAuth(global.api.put(`/customers/${id}`)).send({ phone: '11988887777' });
    expect([200,204]).to.include(res.status);
  });

  it('remove cliente (200)', async () => {
    const toDelete = created.pop();
    const id = toDelete.id || toDelete._id || toDelete.uuid;
    const res = await global.withAuth(global.api.delete(`/customers/${id}`));
    expect([200,204]).to.include(res.status);
  });
});

