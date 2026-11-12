const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

describe('US009 - Forma de pagamento e alerta de margem', () => {
  let client;
  let token;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const stamp = Date.now();

  const createProduct = async (overrides = {}) => {
    const res = await client
      .post('/api/products')
      .set(auth())
      .send({ name: `Produto US009 ${stamp} ${Math.random()}`, price: 100, purchase_price: 40, stock: 50, ...overrides });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    return res.body;
  };

  const createSale = (productId, paymentMethod, extra = {}) =>
    client
      .post('/api/sales')
      .set(auth())
      .send({ clienteNome: 'Cliente US009', items: [{ productId, quantity: 1 }], paymentMethod, ...extra });

  before(async () => {
    client = getClient();
    token = await loginAndGetToken('admin');
  });

  it('API-PAG-001 | Deve gravar e devolver a forma de pagamento da venda', async () => {
    const product = await createProduct();
    const res = await createSale(product.id, 'PIX');
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('paymentMethod', 'PIX');

    const get = await client.get(`/api/sales/${res.body.id}`).set(auth());
    expect(get.status).to.equal(200);
    expect(get.body).to.have.property('paymentMethod', 'PIX');
  });

  it('API-PAG-002 | Deve aceitar nomes em português (débito, dinheiro)', async () => {
    const product = await createProduct();
    const debit = await createSale(product.id, 'débito');
    expect(debit.status).to.equal(201);
    expect(debit.body.paymentMethod).to.equal('DEBIT_CARD');
    const cash = await createSale(product.id, 'Dinheiro');
    expect(cash.status).to.equal(201);
    expect(cash.body.paymentMethod).to.equal('CASH');
  });

  it('API-PAG-003 | Deve rejeitar forma de pagamento desconhecida', async () => {
    const product = await createProduct();
    const res = await createSale(product.id, 'CHEQUE_VOADOR');
    expect(res.status).to.be.oneOf([400, 422]);
  });

  it('API-PAG-004 | Edição troca a forma de pagamento e omitir mantém a anterior', async () => {
    const product = await createProduct();
    const created = await createSale(product.id, 'CASH');
    const id = created.body.id;

    const upd = await client.put(`/api/sales/${id}`).set(auth()).send({ paymentMethod: 'CREDIT_CARD' });
    expect(upd.status, JSON.stringify(upd.body)).to.equal(200);
    let get = await client.get(`/api/sales/${id}`).set(auth());
    expect(get.body.paymentMethod).to.equal('CREDIT_CARD');

    const upd2 = await client
      .put(`/api/sales/${id}`)
      .set(auth())
      .send({ items: [{ productId: product.id, quantity: 2 }] });
    expect(upd2.status, JSON.stringify(upd2.body)).to.equal(200);
    get = await client.get(`/api/sales/${id}`).set(auth());
    expect(get.body.paymentMethod).to.equal('CREDIT_CARD');
  });

  it('API-PAG-005 | Relatório por forma de pagamento soma e ignora canceladas', async () => {
    const day = '2031-03-15';
    const product = await createProduct({ price: 50, purchase_price: 10 });
    expect((await createSale(product.id, 'PIX', { date: day })).status).to.equal(201);
    expect((await createSale(product.id, 'PIX', { date: day })).status).to.equal(201);
    expect((await createSale(product.id, 'CASH', { date: day })).status).to.equal(201);
    const canceled = await createSale(product.id, 'CASH', { date: day });
    const cancel = await client.post(`/api/sales/${canceled.body.id}/cancel`).set(auth()).send({});
    if (cancel.status === 404) {
      await client.patch(`/api/sales/${canceled.body.id}/cancel`).set(auth()).send({});
    }

    const res = await client.get(`/api/reports/payment-methods?day=${day}`).set(auth());
    expect(res.status, JSON.stringify(res.body)).to.equal(200);
    const pix = res.body.methods.find((m) => m.method === 'PIX');
    const cash = res.body.methods.find((m) => m.method === 'CASH');
    expect(pix).to.include({ total: 100, quantidadeVendas: 2, label: 'Pix' });
    expect(cash).to.include({ total: 50, quantidadeVendas: 1, label: 'Dinheiro' });
    expect(res.body.total).to.equal(150);
    expect(pix.share).to.be.closeTo(0.6667, 0.0001);
  });

  it('API-PAG-006 | Relatório rejeita parâmetros desconhecidos e exige autenticação', async () => {
    const bad = await client.get('/api/reports/payment-methods?breakdown=day').set(auth());
    expect(bad.status).to.equal(400);
    const anon = await client.get('/api/reports/payment-methods');
    expect(anon.status).to.equal(401);
  });

  it('API-MRG-001 | Overview lista produto com margem baixa e não lista produto saudável', async () => {
    const low = await createProduct({ name: `Margem Baixa ${stamp}`, price: 100, purchase_price: 85 });
    const ok = await createProduct({ name: `Margem Boa ${stamp}`, price: 100, purchase_price: 30 });
    const res = await client.get('/api/analytics/overview').set(auth());
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('pricingAlerts').that.is.an('array');
    expect(res.body.lowMarginThreshold).to.equal(0.3);
    const lowAlert = res.body.pricingAlerts.find((a) => a.productId === low.id);
    expect(lowAlert).to.include({ level: 'low_margin', price: 100, cost: 85 });
    expect(lowAlert.margin).to.be.closeTo(0.15, 0.0001);
    expect(res.body.pricingAlerts.find((a) => a.productId === ok.id)).to.equal(undefined);
  });

  it('API-MRG-002 | Unidade: produto abaixo do custo vem antes e com mensagem clara', () => {
    const { buildPricingAlerts } = require('../../src/services/analyticsService');
    const alerts = buildPricingAlerts([
      { id: 'a', name: 'Bolo', price: 20, purchase_price: 18 },
      { id: 'b', name: 'Torta', price: 10, purchase_price: 12 },
      { id: 'c', name: 'Pão', price: 10, purchase_price: 2 },
      { id: 'd', name: 'Sem custo', price: 10, purchase_price: null },
    ]);
    expect(alerts.map((a) => a.productId)).to.deep.equal(['b', 'a']);
    expect(alerts[0].level).to.equal('below_cost');
    expect(alerts[0].message).to.contain('abaixo do custo');
  });
});
