const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

const SALES_PATH = '/api/sales';

describe('US014 - Devolucao de estoque ao cancelar/editar venda', () => {
  let client;
  let token;
  let customerId;

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);

  const createProduct = async (stock) => {
    const resp = await auth(client.post('/api/products')).send({
      name: `Produto Devolucao ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

  const cancel = (saleId) => auth(client.post(`${SALES_PATH}/${saleId}/cancel`)).send({});

  const edit = (saleId, items) => auth(client.put(`${SALES_PATH}/${saleId}`)).send({ items });

  before(async () => {
    client = getClient();
    token = await loginAndGetToken('admin');
    const customer = await auth(client.post('/api/customers')).send({
      name: 'Cliente Devolucao',
      email: `devolucao+${Date.now()}@teste.com`,
      phone: '11999990000',
    });
    customerId = customer.body.id;
  });

  it('DEV-001 | Cancelar venda devolve o estoque de produto rastreado (stock <= 5)', async () => {
    const produto = await createProduct(5);
    const venda = await sell([{ productId: produto.id, quantity: 2 }]);
    expect(venda.status, JSON.stringify(venda.body)).to.equal(201);
    expect(await getStock(produto.id)).to.equal(3);

    const resp = await cancel(venda.body.id);
    expect(resp.status, JSON.stringify(resp.body)).to.equal(200);
    expect(await getStock(produto.id)).to.equal(5);
  });

  it('DEV-002 | Produto fora do criterio (stock > 5) nao tem baixa nem devolucao', async () => {
    const produto = await createProduct(50);
    const venda = await sell([{ productId: produto.id, quantity: 2 }]);
    expect(venda.status, JSON.stringify(venda.body)).to.equal(201);
    expect(await getStock(produto.id)).to.equal(50);

    await cancel(venda.body.id);
    expect(await getStock(produto.id)).to.equal(50);
  });

  it('DEV-003 | Cancelar duas vezes nao devolve em duplicidade', async () => {
    const produto = await createProduct(4);
    const venda = await sell([{ productId: produto.id, quantity: 3 }]);
    expect(await getStock(produto.id)).to.equal(1);

    await cancel(venda.body.id);
    await cancel(venda.body.id);
    expect(await getStock(produto.id)).to.equal(4);
  });

  it('DEV-004 | Editar itens ajusta o saldo pelo liquido (reduzir devolve a diferenca)', async () => {
    const produto = await createProduct(5);
    const venda = await sell([{ productId: produto.id, quantity: 4 }]);
    expect(await getStock(produto.id)).to.equal(1);

    const resp = await edit(venda.body.id, [{ productId: produto.id, quantity: 1 }]);
    expect(resp.status, JSON.stringify(resp.body)).to.equal(200);
    expect(await getStock(produto.id)).to.equal(4);
  });

  it('DEV-005 | Editar acima do saldo disponivel retorna 422 e mantem o estado anterior', async () => {
    const produto = await createProduct(5);
    const venda = await sell([{ productId: produto.id, quantity: 2 }]);
    expect(await getStock(produto.id)).to.equal(3);

    const resp = await edit(venda.body.id, [{ productId: produto.id, quantity: 6 }]);
    expect(resp.status).to.equal(422);
    expect(await getStock(produto.id)).to.equal(3);

    // A baixa original continua registrada: cancelar ainda devolve os 2
    await cancel(venda.body.id);
    expect(await getStock(produto.id)).to.equal(5);
  });
});
