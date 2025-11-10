const { expect } = require('chai');

describe('Vendas', () => {
  let customer;
  let products = [];
  let sale;

  it('prepara dados (cliente e produtos)', async () => {
    const custEmail = `cli.sale.${Date.now()}@example.com`;
    const cRes = await global.withAuth(global.api.post('/customers')).send({ name: 'Cliente Venda', email: custEmail, phone: '11977778888' });
    expect(cRes.status).to.equal(201);
    customer = cRes.body;

    for (const name of ['Item A', 'Item B']) {
      const pRes = await global.withAuth(global.api.post('/products')).send({ name: `${name} ${Date.now()}`, price: 10.0, stock: 100 });
      expect(pRes.status).to.equal(201);
      products.push(pRes.body);
    }
  });

  it('cria venda com itens (201)', async () => {
    const items = products.map(p => ({ productId: p.id || p._id || p.uuid, quantity: 2, price: p.price || 10.0 }));
    const payload = { customerId: customer.id || customer._id || customer.uuid, items };
    const res = await global.withAuth(global.api.post('/sales')).send(payload);
    expect([200,201]).to.include(res.status);
    sale = res.body;
  });

  it('lista vendas (200)', async () => {
    const res = await global.withAuth(global.api.get('/sales'));
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  it('busca venda por id (200)', async () => {
    const id = sale.id || sale._id || sale.uuid;
    const res = await global.withAuth(global.api.get(`/sales/${id}`));
    expect([200,204]).to.include(res.status);
  });

  it('atualiza venda (200)', async () => {
    const id = sale.id || sale._id || sale.uuid;
    const res = await global.withAuth(global.api.put(`/sales/${id}`)).send({ note: 'Atualizada via teste' });
    expect([200,204]).to.include(res.status);
  });

  it('cancela venda (200/204)', async () => {
    const id = sale.id || sale._id || sale.uuid;
    const res = await global.withAuth(global.api.post(`/sales/${id}/cancel`));
    expect([200,204]).to.include(res.status);
  });
});

