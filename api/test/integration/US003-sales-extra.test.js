const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

const SALES_PATH = '/api/sales';
const PRODUCTS_PATH = '/api/products';
const CUSTOMERS_PATH = '/api/customers';

describe('US003 - Vendas (extras)', () => {
  let client;
  let token;
  let customerId;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  const createProduct = async (overrides = {}) =>
    client
      .post(PRODUCTS_PATH)
      .set(auth(token))
      .send({
        name: `Produto Venda ${Date.now()}`,
        price: 100,
        purchase_price: 50,
        stock: 10,
        ...overrides,
      });

  before(async () => {
    client = getClient();
    token = await loginAndGetToken('admin');

    const customerResp = await client
      .post(CUSTOMERS_PATH)
      .set(auth(token))
      .send({
        name: 'Cliente Venda Extra',
        email: `sale-extra+${Date.now()}@teste.com`,
      });
    customerId = customerResp.body.id;
  });

  it('API-VEN-025 | Deve permitir venda sem customerId quando clienteNome informado', async () => {
    const product = await createProduct();

    const response = await client
      .post(SALES_PATH)
      .set(auth(token))
      .send({
        clienteNome: 'Cliente Avulso',
        items: [{ productId: product.body.id, quantity: 1 }],
        paymentMethod: 'PIX',
      });

    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('clienteNome', 'Cliente Avulso');
  });

  it('API-VEN-026 | Deve bloquear venda de produto inativo', async () => {
    const product = await createProduct({ statusProduto: 'INATIVO' });

    const response = await client
      .post(SALES_PATH)
      .set(auth(token))
      .send({
        customerId,
        items: [{ productId: product.body.id, quantity: 1 }],
        paymentMethod: 'PIX',
      });

    expect(response.status).to.equal(422);
  });
});
