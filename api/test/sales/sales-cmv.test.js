const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../../src/app');
const { db } = require('../../src/models/db');

const { expect } = chai;
chai.use(chaiHttp);

const adminEmail = process.env.ADMIN_EMAIL || 'admin@negocio.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

let authToken;

describe('Teste de CMV (Custo da Mercadoria Vendida)', () => {
  before(async () => {
    const loginRes = await chai
      .request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword });

    expect(loginRes).to.have.status(200);
    authToken = loginRes.body.token;
  });

  beforeEach(() => {
    db.customers = [
      {
        id: 'c1',
        name: 'Cliente CMV',
        email: 'cliente.cmv@example.com',
        phone: '11999990000',
      },
    ];
    db.products = [
      { id: 'p1', name: 'Produto 1', price: 100, purchase_price: 50 },
      { id: 'p2', name: 'Produto 2', price: 200, purchase_price: 120 },
    ];
    db.sales = [];
  });

  it('Deve calcular e salvar o CMV corretamente ao registrar uma venda', async () => {
    const saleData = {
      customerId: 'c1',
      items: [
        { productId: 'p1', quantity: 2, unitPrice: 100 },
        { productId: 'p2', quantity: 1, unitPrice: 200 },
      ],
    };

    const res = await chai
      .request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${authToken}`)
      .send(saleData);

    expect(res).to.have.status(201);
    expect(res.body).to.have.property('cmv');
    expect(res.body.cmv).to.equal(220); // (2 * 50) + (1 * 120)

    expect(res.body.items[0]).to.have.property('cmv', 100); // 2 * 50
    expect(res.body.items[1]).to.have.property('cmv', 120); // 1 * 120
  });
});
