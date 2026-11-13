const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');
const {
  validate,
  v,
  requireObjectBody,
  rejectNestedQuery,
} = require('../../src/middleware/validate');

// Executa um middleware com um req falso e devolve o erro passado ao next() (ou null)
const run = (middleware, req) => {
  let received = null;
  middleware({ method: 'POST', body: {}, query: {}, params: {}, ...req }, {}, (err) => {
    received = err || null;
  });
  return received;
};

describe('US013 - Validacao generica de entrada', () => {
  describe('validate() - regras', () => {
    it('VAL-001 | string: aceita texto, recusa tipo errado e excesso de tamanho', () => {
      const mw = validate({ body: { name: v.string({ max: 5 }) } });
      expect(run(mw, { body: { name: 'abc' } })).to.equal(null);
      expect(run(mw, { body: { name: 123 } }).message).to.equal('name deve ser texto');
      expect(run(mw, { body: { name: ['a'] } }).message).to.equal('name deve ser texto');
      expect(run(mw, { body: { name: 'abcdef' } }).message).to.equal(
        'name deve ter no máximo 5 caracteres'
      );
      expect(run(mw, { body: { name: 123 } }).status).to.equal(400);
    });

    it('VAL-002 | campos ausentes ou null sao ignorados (obrigatoriedade e dos servicos)', () => {
      const mw = validate({ body: { name: v.string({ max: 5 }) } });
      expect(run(mw, { body: {} })).to.equal(null);
      expect(run(mw, { body: { name: null } })).to.equal(null);
    });

    it('VAL-003 | number: recusa NaN/string e respeita min e max', () => {
      const mw = validate({ body: { qty: v.number({ min: 1, max: 10 }) } });
      expect(run(mw, { body: { qty: 5 } })).to.equal(null);
      expect(run(mw, { body: { qty: '5' } }).message).to.equal('qty deve ser um número');
      expect(run(mw, { body: { qty: NaN } }).message).to.equal('qty deve ser um número');
      expect(run(mw, { body: { qty: 0 } }).message).to.equal('qty deve ser maior ou igual a 1');
      expect(run(mw, { body: { qty: 11 } }).message).to.equal('qty deve ser menor ou igual a 10');
    });

    it('VAL-004 | array de objetos: recusa nao-lista, elemento null e elemento nao-objeto', () => {
      const mw = validate({ body: { items: v.array({ of: v.object() }) } });
      expect(run(mw, { body: { items: [{ a: 1 }] } })).to.equal(null);
      expect(run(mw, { body: { items: 'x' } }).message).to.equal('items deve ser uma lista');
      expect(run(mw, { body: { items: [null] } }).message).to.equal('items[0] é inválido');
      expect(run(mw, { body: { items: [{}, 'x'] } }).message).to.equal('items[1] deve ser um objeto');
    });

    it('VAL-005 | objeto aninhado informa o caminho do campo com erro', () => {
      const mw = validate({ body: { address: v.object({ city: v.string({ max: 3 }) }) } });
      expect(run(mw, { body: { address: { city: 'abc' } } })).to.equal(null);
      expect(run(mw, { body: { address: { city: 'abcd' } } }).message).to.equal(
        'address.city deve ter no máximo 3 caracteres'
      );
    });

    it('VAL-006 | validate({ body }) recusa corpo que nao seja objeto', () => {
      const mw = validate({ body: { name: v.string() } });
      expect(run(mw, { body: [] }).message).to.equal('O corpo da requisição deve ser um objeto JSON');
    });

    it('VAL-007 | requireObjectBody e rejectNestedQuery', () => {
      expect(run(requireObjectBody, { body: [] }).status).to.equal(400);
      expect(run(requireObjectBody, { body: {} })).to.equal(null);
      expect(run(requireObjectBody, { method: 'GET', body: [] })).to.equal(null);
      expect(run(rejectNestedQuery, { query: { search: ['a', 'b'] } }).message).to.equal(
        'Parâmetro de consulta inválido: search'
      );
      expect(run(rejectNestedQuery, { query: { search: { a: '1' } } }).status).to.equal(400);
      expect(run(rejectNestedQuery, { query: { search: 'ok', page: '2' } })).to.equal(null);
    });
  });

  describe('API - entradas malformadas nao geram 500', () => {
    let client;
    let token;
    const auth = (req) => req.set('Authorization', `Bearer ${token}`);

    before(async () => {
      client = getClient();
      token = await loginAndGetToken('admin');
    });

    it('VAL-010 | POST /api/sales sem items responde 422 (antes: 500)', async () => {
      const res = await auth(client.post('/api/sales')).send({});
      expect(res.status, JSON.stringify(res.body)).to.equal(422);
    });

    it('VAL-011 | POST /api/sales com corpo array responde 400 (antes: 500)', async () => {
      const res = await auth(client.post('/api/sales')).send([]);
      expect(res.status, JSON.stringify(res.body)).to.equal(400);
    });

    it('VAL-012 | POST /api/sales com items invalido (string ou [null]) responde 400', async () => {
      const a = await auth(client.post('/api/sales')).send({ items: 'x' });
      const b = await auth(client.post('/api/sales')).send({ items: [null] });
      expect(a.status, JSON.stringify(a.body)).to.equal(400);
      expect(b.status, JSON.stringify(b.body)).to.equal(400);
    });

    it('VAL-013 | query com array/objeto responde 400 (antes: 500 em /customers?search[a]=1)', async () => {
      const a = await auth(client.get('/api/customers?search[a]=1'));
      const b = await auth(client.get('/api/customers?search[]=x&search[]=y'));
      const c = await auth(client.get('/api/customers?search=x&search=y'));
      expect(a.status).to.equal(400);
      expect(b.status).to.equal(400);
      expect(c.status).to.equal(400);
      expect(a.body.message).to.include('search');
    });

    it('VAL-014 | page gigante responde 400 em clientes, produtos e vendas (antes: 500)', async () => {
      for (const path of ['/api/customers', '/api/products', '/api/sales']) {
        const res = await auth(client.get(`${path}?page=99999999999999999999`));
        expect(res.status, `${path}: ${JSON.stringify(res.body)}`).to.equal(400);
      }
    });

    it('VAL-015 | cliente com email em array ou nome gigante responde 400 (antes: 201)', async () => {
      const a = await auth(client.post('/api/customers')).send({ name: 'Ok', email: ['a@b.com'] });
      const b = await auth(client.post('/api/customers')).send({
        name: 'x'.repeat(20000),
        email: `val+${Date.now()}@teste.com`,
      });
      expect(a.status, JSON.stringify(a.body)).to.equal(400);
      expect(b.status, JSON.stringify(b.body)).to.equal(400);
    });

    it('VAL-016 | produto com nome em objeto responde 400', async () => {
      const res = await auth(client.post('/api/products')).send({
        name: { $ne: 1 },
        price: 10,
        purchase_price: 5,
      });
      expect(res.status, JSON.stringify(res.body)).to.equal(400);
    });

    it('VAL-017 | entradas validas continuam funcionando', async () => {
      const list = await auth(client.get('/api/customers?search=abc&page=1&limit=10'));
      expect(list.status).to.equal(200);
      const created = await auth(client.post('/api/customers')).send({
        name: 'Cliente Validacao',
        email: `val+${Date.now()}@teste.com`,
        phone: '11999990000',
      });
      expect(created.status, JSON.stringify(created.body)).to.equal(201);
    });
  });
});
