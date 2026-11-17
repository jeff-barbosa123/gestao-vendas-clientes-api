const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

const SALES_PATH = '/api/sales';

// Todo produto com controle de estoque (stock IS NOT NULL) deve ter o saldo validado e baixado
// de forma atomica, independentemente do tamanho do saldo.
describe('US003 - Vendas: controle de estoque de produtos (saldo acima de 5)', () => {
  let client;
  let token;
  let customerId;

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);

  const createProduct = async (stock) => {
    const resp = await auth(client.post('/api/products')).send({
      name: `Produto Estoque ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      price: 100,
      purchase_price: 50,
      stock,
    });
    expect(resp.status).to.equal(201);
    return resp.body;
  };

  const getStock = async (productId) => {
    const resp = await auth(client.get(`/api/products/${productId}`));
    return resp.body.stock;
  };

  const sell = (productId, quantity) =>
    auth(client.post(SALES_PATH)).send({
      customerId,
      items: [{ productId, quantity }],
      paymentMethod: 'PIX',
    });

  before(async () => {
    client = getClient();
    token = await loginAndGetToken('admin');
    const customerResp = await auth(client.post('/api/customers')).send({
      name: 'Cliente Estoque',
      email: `stock+${Date.now()}@teste.com`,
      phone: '11999990000',
    });
    customerId = customerResp.body.id;
  });

  it('baixa o estoque quando o saldo e maior que 5', async () => {
    const produto = await createProduct(10);
    const venda = await sell(produto.id, 3);
    expect(venda.status).to.equal(201);
    expect(await getStock(produto.id)).to.equal(7);
  });

  it('impede venda acima do saldo mesmo com saldo maior que 5 (422) e mantem o estoque', async () => {
    const produto = await createProduct(10);
    const venda = await sell(produto.id, 11);
    expect(venda.status).to.equal(422);
    expect(await getStock(produto.id)).to.equal(10);
  });

  it('cancelar a venda devolve exatamente o que saiu', async () => {
    const produto = await createProduct(10);
    const venda = await sell(produto.id, 4);
    expect(venda.status).to.equal(201);
    expect(await getStock(produto.id)).to.equal(6);

    const cancel = await auth(client.post(`${SALES_PATH}/${venda.body.id}/cancel`)).send({});
    expect([200, 204]).to.include(cancel.status);
    expect(await getStock(produto.id)).to.equal(10);
  });

  it('vendas simultaneas nao deixam o saldo negativo nem vendem alem do estoque', async () => {
    const produto = await createProduct(8);
    const resultados = await Promise.all(Array.from({ length: 12 }, () => sell(produto.id, 1)));
    const ok = resultados.filter((r) => r.status === 201).length;
    const recusadas = resultados.filter((r) => r.status === 422).length;
    expect(ok).to.equal(8);
    expect(recusadas).to.equal(4);
    expect(await getStock(produto.id)).to.equal(0);
  });

  it('produto sem controle de estoque (stock nulo) continua vendendo sem limite', async () => {
    const produto = await createProduct(null);
    const venda = await sell(produto.id, 50);
    expect(venda.status).to.equal(201);
    expect(await getStock(produto.id)).to.equal(null);
  });
});
