// Testes de regressão dos bugs corrigidos na varredura de 11/11/2026.
// Cada teste falhava antes da correção correspondente.
const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken, USERS } = require('../utils/authHelper');

describe('US998 - Regressões (varredura 11/11/2026)', () => {
  let http;
  let adminToken;
  let otherToken;

  const auth = (token) => ({ Authorization: `Bearer ${token}` });

  const createProduct = async (token, overrides = {}) => {
    const res = await http
      .post('/api/products')
      .set(auth(token))
      .send({
        name: `Produto Regressao ${Date.now()}-${Math.random().toString(16).slice(2)}`,
        price: 100,
        purchase_price: 40,
        stock: 50,
        ...overrides,
      });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    return res.body;
  };

  const createSale = async (token, productId, extra = {}) => {
    const res = await http
      .post('/api/sales')
      .set(auth(token))
      .send({
        clienteNome: 'Cliente Regressão',
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'PIX',
        ...extra,
      });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    return res.body;
  };

  before(async () => {
    http = getClient();
    adminToken = await loginAndGetToken('admin');
    otherToken = await loginAndGetToken('other');
  });

  describe('Isolamento de dados entre usuários', () => {
    it('REG-001 | /api/sales/summary soma apenas as vendas do usuário autenticado', async () => {
      const before = await http.get('/api/sales/summary').set(auth(otherToken));
      expect(before.status).to.equal(200);

      const product = await createProduct(adminToken);
      await createSale(adminToken, product.id);

      const after = await http.get('/api/sales/summary').set(auth(otherToken));
      expect(after.status).to.equal(200);
      expect(after.body.total).to.equal(before.body.total);
    });

    it('REG-002 | /api/analytics/timeseries considera apenas as vendas do usuário autenticado', async () => {
      const day = '2098-05-20';
      const query = `?breakdown=day&day=${day}`;

      const product = await createProduct(adminToken);
      await createSale(adminToken, product.id, { date: day });

      const own = await http.get(`/api/analytics/timeseries${query}`).set(auth(adminToken));
      const other = await http.get(`/api/analytics/timeseries${query}`).set(auth(otherToken));
      expect(own.status).to.equal(200);
      expect(other.status).to.equal(200);

      const bucket = (body) => (Array.isArray(body) ? body.find((b) => b.period === day) : null);
      expect(bucket(own.body), 'admin deve ver a própria venda').to.exist;
      const otherBucket = bucket(other.body);
      expect(otherBucket ? otherBucket.salesCount : 0, 'outro usuário não pode ver vendas do admin').to.equal(0);
    });
  });

  describe('Vendas canceladas', () => {
    it('REG-003 | Venda cancelada não entra no faturamento do dashboard', async () => {
      const day = '2098-06-10';
      const product = await createProduct(adminToken, { price: 77 });
      const sale = await createSale(adminToken, product.id, { date: day });

      const overview = () => http.get(`/api/analytics/overview?day=${day}`).set(auth(adminToken));

      const beforeCancel = await overview();
      expect(beforeCancel.status).to.equal(200);
      expect(beforeCancel.body.salesCount).to.be.at.least(1);

      const cancel = await http.post(`/api/sales/${sale.id}/cancel`).set(auth(adminToken));
      expect(cancel.status).to.be.oneOf([200, 204]);

      const afterCancel = await overview();
      expect(afterCancel.status).to.equal(200);
      expect(afterCancel.body.salesCount).to.equal(beforeCancel.body.salesCount - 1);
      expect(afterCancel.body.revenueTotal).to.equal(
        Number((beforeCancel.body.revenueTotal - sale.total).toFixed(2))
      );
    });

    it('REG-004 | POST sem corpo (cancelar venda) não é rejeitado com 415', async () => {
      const product = await createProduct(adminToken);
      const sale = await createSale(adminToken, product.id);
      const res = await http.post(`/api/sales/${sale.id}/cancel`).set(auth(adminToken));
      expect(res.status).to.not.equal(415);
      expect(res.status).to.be.oneOf([200, 204]);
    });
  });

  describe('Dashboard', () => {
    it('REG-005 | lastSaleAt aponta para a venda mais recente', async () => {
      const product = await createProduct(adminToken);
      await createSale(adminToken, product.id, { date: '2097-01-01' });
      await createSale(adminToken, product.id, { date: '2097-01-05' });

      const res = await http
        .get('/api/analytics/overview?start=2097-01-01&end=2097-01-31')
        .set(auth(adminToken));
      expect(res.status).to.equal(200);
      expect(new Date(res.body.lastSaleAt).toISOString().slice(0, 10)).to.equal('2097-01-05');
    });
  });

  describe('IDs inválidos', () => {
    it('REG-006 | ID em formato inválido retorna 404 (não 500)', async () => {
      for (const path of ['/api/customers/abc', '/api/products/123', '/api/sales/nao-existe', '/api/recipes/xyz']) {
        const res = await http.get(path).set(auth(adminToken));
        expect(res.status, path).to.equal(404);
      }
    });
  });

  describe('CSRF (autenticação por cookie)', () => {
    it('REG-007 | Requisição autenticada por cookie sem X-CSRF-Token é bloqueada (403)', async () => {
      const login = await http
        .post('/api/auth/login')
        .send({ email: USERS.admin.email, password: USERS.admin.password });
      expect(login.status).to.equal(200);
      const cookies = (login.headers['set-cookie'] || []).map((c) => c.split(';')[0]);
      expect(cookies.some((c) => c.startsWith('sgvc_token='))).to.equal(true);

      const semCsrf = await http
        .post('/api/customers')
        .set('Cookie', cookies.join('; '))
        .send({ name: 'Sem CSRF', email: `csrf+${Date.now()}@teste.com` });
      expect(semCsrf.status).to.equal(403);

      const csrfToken = 'token-de-teste-csrf';
      const comCsrf = await http
        .post('/api/customers')
        .set('Cookie', [...cookies, `sgvc_csrf=${csrfToken}`].join('; '))
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Com CSRF', email: `csrf-ok+${Date.now()}@teste.com` });
      expect(comCsrf.status).to.equal(201);
    });

    it('REG-008 | Requisição com Bearer (sem cookie de sessão) não exige CSRF', async () => {
      const res = await http
        .post('/api/customers')
        .set(auth(adminToken))
        .send({ name: 'Com Bearer', email: `bearer+${Date.now()}@teste.com` });
      expect(res.status).to.equal(201);
    });
  });

  describe('Mensagens de erro', () => {
    it('REG-009 | Senha errada no login não retorna "sessão expirada"', async () => {
      const res = await http
        .post('/api/auth/login')
        .send({ email: 'naoexiste+regressao@sgvc.local', password: 'SenhaErrada@1' });
      expect(res.status).to.equal(401);
      expect(res.body.error).to.equal('Credenciais inválidas');
    });

    it('REG-010 | Validação do login segue o formato padrão (success/code/message/error)', async () => {
      const res = await http.post('/api/auth/login').send({ email: 'invalido', password: 'x' });
      expect(res.status).to.equal(400);
      expect(res.body).to.include.keys('success', 'code', 'message', 'error');
      expect(res.body.message).to.equal(res.body.error);
    });
  });

  describe('Relatórios e listagem de vendas', () => {
    it('REG-011 | Relatório "Sem filtro" considera todas as vendas (antes voltava zerado)', async () => {
      const product = await createProduct(adminToken);
      await createSale(adminToken, product.id);
      const res = await http.get('/api/reports/financial?breakdown=total').set(auth(adminToken));
      expect(res.status).to.equal(200);
      const body = Array.isArray(res.body) ? res.body[0] : res.body;
      expect(Number(body.revenue ?? body.total ?? 0)).to.be.above(0);
    });

    it('REG-012 | Venda de cliente cadastrado traz o nome do cliente', async () => {
      const customer = await http
        .post('/api/customers')
        .set(auth(adminToken))
        .send({ name: 'Cliente Nome Regressao', email: `nome+${Date.now()}@teste.com` });
      expect(customer.status).to.equal(201);
      const product = await createProduct(adminToken);
      const sale = await createSale(adminToken, product.id, { clienteNome: undefined, customerId: customer.body.id });

      const one = await http.get(`/api/sales/${sale.id}`).set(auth(adminToken));
      expect(one.status).to.equal(200);
      expect(one.body.customerName).to.equal('Cliente Nome Regressao');

      const list = await http.get('/api/sales').set(auth(adminToken));
      const rows = Array.isArray(list.body) ? list.body : list.body.items || list.body.data || [];
      const found = rows.find((r) => r.id === sale.id);
      expect(found, 'venda na listagem').to.exist;
      expect(found.customerName).to.equal('Cliente Nome Regressao');
    });
  });
});
