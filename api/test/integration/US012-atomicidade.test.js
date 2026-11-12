const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

const SALES_PATH = '/api/sales';

describe('US012 - Atomicidade e concorrencia em vendas', () => {
  let client;
  let token;
  let customerId;

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);

  const createProduct = async (stock) => {
    const resp = await auth(client.post('/api/products')).send({
      name: `Produto Atomico ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      price: 100,
      purchase_price: 50,
      stock,
    });
    expect(resp.status, JSON.stringify(resp.body)).to.equal(201);
    return resp.body;
  };

  const getStock = async (productId) => {
    const resp = await auth(client.get(`/api/products/${productId}`));
    return resp.body.stock;
  };

  const sell = (items) =>
    auth(client.post(SALES_PATH)).send({ customerId, items, paymentMethod: 'PIX' });

  before(async () => {
    client = getClient();
    token = await loginAndGetToken('admin');
    const customer = await auth(client.post('/api/customers')).send({
      name: 'Cliente Atomicidade',
      email: `atomic+${Date.now()}@teste.com`,
      phone: '11999990000',
    });
    customerId = customer.body.id;
  });

  it('ATOM-001 | Duas vendas simultaneas do ultimo item: so uma passa e o estoque zera', async () => {
    const produto = await createProduct(1);

    const results = await Promise.all([
      sell([{ productId: produto.id, quantity: 1 }]),
      sell([{ productId: produto.id, quantity: 1 }]),
    ]);

    expect(results.map((r) => r.status).sort()).to.deep.equal([201, 422]);
    expect(await getStock(produto.id)).to.equal(0);
  });

  it('ATOM-002 | Rajada de 6 vendas com estoque 3: exatamente 3 passam e o estoque nunca fica negativo', async () => {
    const produto = await createProduct(3);

    const results = await Promise.all(
      Array.from({ length: 6 }, () => sell([{ productId: produto.id, quantity: 1 }]))
    );

    const ok = results.filter((r) => r.status === 201);
    const recusadas = results.filter((r) => r.status !== 201);
    expect(ok).to.have.length(3);
    expect(recusadas.every((r) => r.status === 422)).to.equal(true);
    expect(await getStock(produto.id)).to.equal(0);
  });

  it('ATOM-003 | Mesmo produto em dois itens soma a quantidade, recusa a venda e nao altera o estoque', async () => {
    const produto = await createProduct(3);

    const resp = await sell([
      { productId: produto.id, quantity: 2 },
      { productId: produto.id, quantity: 2 },
    ]);

    expect(resp.status, JSON.stringify(resp.body)).to.equal(422);
    expect(await getStock(produto.id)).to.equal(3);
  });
});
