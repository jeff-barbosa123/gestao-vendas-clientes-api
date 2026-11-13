const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

describe('US015 - Auditoria de vendas persistida no banco', () => {
  let client;
  let token;
  let customerId;
  let productId;

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);

  before(async () => {
    client = getClient();
    token = await loginAndGetToken('admin');
    const customer = await auth(client.post('/api/customers')).send({
      name: 'Cliente Auditoria',
      email: `auditoria+${Date.now()}@teste.com`,
      phone: '11999990000',
    });
    customerId = customer.body.id;
    const product = await auth(client.post('/api/products')).send({
      name: `Produto Auditoria ${Date.now()}`,
      price: 100,
      purchase_price: 50,
      stock: 50,
    });
    productId = product.body.id;
  });

  it('AUD-001 | Historico registra CREATED, UPDATED e CANCELED em ordem, com o usuario', async () => {
    const venda = await auth(client.post('/api/sales')).send({
      customerId,
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'PIX',
    });
    expect(venda.status, JSON.stringify(venda.body)).to.equal(201);
    const saleId = venda.body.id;

    const edit = await auth(client.put(`/api/sales/${saleId}`)).send({
      items: [{ productId, quantity: 2 }],
    });
    expect(edit.status, JSON.stringify(edit.body)).to.equal(200);
    await auth(client.post(`/api/sales/${saleId}/cancel`)).send({});

    const audit = await auth(client.get(`/api/sales/${saleId}/audit`));
    expect(audit.status).to.equal(200);
    expect(audit.body.history.map((h) => h.action)).to.deep.equal(['CREATED', 'UPDATED', 'CANCELED']);
    expect(audit.body.lastAction).to.equal('CANCELED');
    expect(audit.body.history.every((h) => h.performedBy && h.performedAt)).to.equal(true);
  });

  it('AUD-002 | Venda sem historico retorna CREATED padrao e inexistente retorna 404', async () => {
    const naoExiste = await auth(client.get('/api/sales/00000000-0000-4000-8000-000000000000/audit'));
    expect(naoExiste.status).to.equal(404);
  });
});
