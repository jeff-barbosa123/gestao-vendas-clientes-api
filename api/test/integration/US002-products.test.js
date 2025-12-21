const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

const PRODUCTS_PATH = '/api/products';

const MESSAGES = {
  required: 'Campos obrigat\u00f3rios ausentes',
  notFound: 'Produto n\u00e3o encontrado',
  invalidPrice: 'Pre\u00e7o inv\u00e1lido',
};

const uniqueName = (prefix = 'Produto') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('Produtos', () => {
  let http;
  let token;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });
  const postProduct = (body) => http.post(PRODUCTS_PATH).set(auth(token)).send(body);
  const putProduct = (id, body) => http.put(`${PRODUCTS_PATH}/${id}`).set(auth(token)).send(body);
  const deleteProduct = (id) => http.delete(`${PRODUCTS_PATH}/${id}`).set(auth(token));
  const getProduct = (id) => http.get(`${PRODUCTS_PATH}/${id}`).set(auth(token));

  before(async () => {
    http = getClient();
    token = await loginAndGetToken('admin');
  });

  it('API-PROD-001 | Deve listar produtos (200)', async () => {
    const res = await http.get(PRODUCTS_PATH).set(auth(token));
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  it('API-PROD-002 | Deve retornar 422 sem nome', async () => {
    const res = await postProduct({ price: 10, purchase_price: 5 });
    expect(res.status).to.equal(422);
    expect(res.body.error).to.equal(MESSAGES.required);
  });

  it('API-PROD-003 | Deve retornar 422 sem pre\u00e7o', async () => {
    const res = await postProduct({ name: uniqueName('SemPreco'), purchase_price: 5 });
    expect(res.status).to.equal(422);
    expect(res.body.error).to.equal(MESSAGES.required);
  });

  it('API-PROD-004 | Deve criar produto v?lido', async () => {
    const payload = { name: uniqueName('Valido'), price: 50, purchase_price: 20, stock: 5 };
    const res = await postProduct(payload);
    expect(res.status).to.equal(201);
    expect(res.body).to.include({ name: payload.name });
    expect(res.body).to.have.property('id');
  });

  it('API-PROD-005 | Deve retornar 422 para pre\u00e7o inv\u00e1lido', async () => {
    const res = await postProduct({ name: uniqueName('PrecoInvalido'), price: -1, purchase_price: 5 });
    expect(res.status).to.equal(422);
    expect(res.body.error).to.equal(MESSAGES.invalidPrice);
  });

  it('API-PROD-006 | Deve retornar 200 ao atualizar produto existente', async () => {
    const created = await postProduct({ name: uniqueName('Atualizar'), price: 30, purchase_price: 10 });
    const id = created.body.id;

    const res = await putProduct(id, { name: 'Produto Atualizado', price: 35 });
    expect(res.status).to.equal(200);
    expect(res.body.name).to.equal('Produto Atualizado');
    expect(res.body.price).to.equal(35);
  });

  it('API-PROD-007 | Deve retornar 404 ao atualizar produto inexistente', async () => {
    const res = await putProduct('prod-inexistente', { name: 'Nao Existe', price: 10 });
    expect(res.status).to.equal(404);
    expect(res.body.error).to.equal(MESSAGES.notFound);
  });

  it('API-PROD-008 | Deve retornar os dados do produto por ID', async () => {
    const created = await postProduct({ name: uniqueName('Buscar'), price: 70, purchase_price: 25 });
    const id = created.body.id;

    const res = await getProduct(id);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id', id);
  });

  it('API-PROD-009 | Deve retornar 404 ao buscar produto inexistente', async () => {
    const res = await getProduct('prod-inexistente');
    expect(res.status).to.equal(404);
    expect(res.body.error).to.equal(MESSAGES.notFound);
  });

  it('API-PROD-010 | Deve excluir produto existente', async () => {
    const created = await postProduct({ name: uniqueName('Excluir'), price: 80, purchase_price: 30 });
    const id = created.body.id;

    const res = await deleteProduct(id);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id', id);
  });

  it('API-PROD-011 | Deve retornar 404 ao excluir produto inexistente', async () => {
    const res = await deleteProduct('prod-inexistente');
    expect(res.status).to.equal(404);
    expect(res.body.error).to.equal(MESSAGES.notFound);
  });
});
