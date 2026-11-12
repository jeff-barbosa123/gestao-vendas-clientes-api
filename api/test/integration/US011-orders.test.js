// US011 - Encomendas com data de entrega, sinal, status e entrega virando venda
const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

describe('US011 - Encomendas', () => {
  let http;
  let token;
  let otherToken;
  let seq = 0;

  const auth = (t = token) => ({ Authorization: `Bearer ${t}` });
  const unique = (prefix) => `${prefix} ${Date.now()}-${++seq}`;
  const inDays = (days, hour = 14) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    d.setUTCHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const createProduct = async (price = 4) => {
    const res = await http.post('/api/products').set(auth()).send({ name: unique('Brigadeiro'), price, purchase_price: 1, stock: 1000 });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    return res.body;
  };

  const createOrder = (overrides = {}) =>
    http.post('/api/orders').set(auth()).send({
      customerName: 'Maria Festa',
      customerPhone: '(81) 99999-0000',
      deliveryAt: inDays(2),
      deposit: 20,
      depositMethod: 'PIX',
      notes: 'Tema azul',
      ...overrides,
    });

  before(async () => {
    http = getClient();
    token = await loginAndGetToken('admin');
    otherToken = await loginAndGetToken('other');
  });

  it('ENC-001 | Cria encomenda com total pelo preço do produto e saldo a receber', async () => {
    const p = await createProduct(4);
    const res = await createOrder({ items: [{ productId: p.id, quantity: 25 }] });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    expect(res.body).to.include({ status: 'PENDING', statusLabel: 'A fazer', total: 100, deposit: 20, balanceDue: 80, depositMethod: 'PIX' });
    expect(res.body.items[0]).to.include({ productId: p.id, productName: p.name, quantity: 25, unitPrice: 4, total: 100 });
  });

  it('ENC-002 | Preço combinado no item vale no lugar do preço do produto', async () => {
    const p = await createProduct(4);
    const res = await createOrder({ items: [{ productId: p.id, quantity: 10, unitPrice: 3.5 }], deposit: 0 });
    expect(res.status).to.equal(201);
    expect(res.body.total).to.equal(35);
  });

  it('ENC-003 | Valida cliente, data, itens e sinal', async () => {
    const p = await createProduct();
    const semCliente = await createOrder({ customerName: '', items: [{ productId: p.id, quantity: 1 }] });
    expect(semCliente.status).to.equal(400);
    const semData = await createOrder({ deliveryAt: '', items: [{ productId: p.id, quantity: 1 }] });
    expect(semData.status).to.equal(400);
    const semItens = await createOrder({ items: [] });
    expect(semItens.status).to.equal(400);
    const sinalAlto = await createOrder({ items: [{ productId: p.id, quantity: 1 }], deposit: 50 });
    expect(sinalAlto.status).to.equal(400);
    expect(sinalAlto.body.message).to.contain('sinal');
    const telefone = await createOrder({ customerPhone: '123', items: [{ productId: p.id, quantity: 1 }] });
    expect(telefone.status).to.equal(400);
  });

  it('ENC-004 | Lista por período e status, em ordem de entrega', async () => {
    const p = await createProduct();
    const later = (await createOrder({ deliveryAt: inDays(5), deposit: 0, items: [{ productId: p.id, quantity: 1 }] })).body;
    const sooner = (await createOrder({ deliveryAt: inDays(1), deposit: 0, items: [{ productId: p.id, quantity: 1 }] })).body;
    const far = (await createOrder({ deliveryAt: inDays(40), deposit: 0, items: [{ productId: p.id, quantity: 1 }] })).body;

    const res = await http.get(`/api/orders?from=${inDays(0, 0)}&to=${inDays(7, 0)}&status=PENDING`).set(auth());
    expect(res.status).to.equal(200);
    const ids = res.body.map((o) => o.id);
    expect(ids).to.include.members([sooner.id, later.id]);
    expect(ids).to.not.include(far.id);
    expect(ids.indexOf(sooner.id)).to.be.lessThan(ids.indexOf(later.id));

    const bad = await http.get('/api/orders?status=QUALQUER').set(auth());
    expect(bad.status).to.equal(400);
  });

  it('ENC-005 | Fluxo a fazer -> pronta -> entregue cria a venda com a forma de pagamento', async () => {
    const p = await createProduct(4);
    const order = (await createOrder({ items: [{ productId: p.id, quantity: 25 }] })).body;

    const ready = await http.post(`/api/orders/${order.id}/status`).set(auth()).send({ status: 'READY' });
    expect(ready.status).to.equal(200);
    expect(ready.body).to.include({ status: 'READY', statusLabel: 'Pronta' });

    const delivered = await http.post(`/api/orders/${order.id}/status`).set(auth()).send({ status: 'DELIVERED', paymentMethod: 'CASH' });
    expect(delivered.status, JSON.stringify(delivered.body)).to.equal(200);
    expect(delivered.body.status).to.equal('DELIVERED');
    expect(delivered.body.saleId).to.be.a('string');
    expect(delivered.body.deliveredAt).to.be.a('string');

    const sale = await http.get(`/api/sales/${delivered.body.saleId}`).set(auth());
    expect(sale.status).to.equal(200);
    expect(sale.body).to.include({ paymentMethod: 'CASH', total: 100 });
    expect(sale.body.customerName || sale.body.clienteNome).to.equal('Maria Festa');
  });

  it('ENC-006 | Entregue ou cancelada não muda mais', async () => {
    const p = await createProduct();
    const order = (await createOrder({ deposit: 0, items: [{ productId: p.id, quantity: 2 }] })).body;
    expect((await http.post(`/api/orders/${order.id}/status`).set(auth()).send({ status: 'CANCELED' })).status).to.equal(200);
    const again = await http.post(`/api/orders/${order.id}/status`).set(auth()).send({ status: 'DELIVERED' });
    expect(again.status).to.equal(422);
    const edit = await http.put(`/api/orders/${order.id}`).set(auth()).send({ notes: 'mudou' });
    expect(edit.status).to.equal(422);
  });

  it('ENC-007 | Editar encomenda em aberto recalcula o total', async () => {
    const p = await createProduct(4);
    const order = (await createOrder({ deposit: 10, items: [{ productId: p.id, quantity: 5 }] })).body;
    const upd = await http
      .put(`/api/orders/${order.id}`)
      .set(auth())
      .send({ items: [{ productId: p.id, quantity: 12 }], deliveryAt: inDays(3), notes: 'Mais 7' });
    expect(upd.status, JSON.stringify(upd.body)).to.equal(200);
    expect(upd.body).to.include({ total: 48, deposit: 10, balanceDue: 38, notes: 'Mais 7' });
    expect(upd.body.items).to.have.length(1);
  });

  it('ENC-008 | Previsão de insumos aponta o que falta para as encomendas', async () => {
    const ing = await http
      .post('/api/ingredients')
      .set(auth())
      .send({ name: unique('Leite condensado'), packageQuantity: 395, packageUnit: 'g', packageCost: 7.5 });
    await http.post(`/api/ingredients/${ing.body.id}/stock/adjust`).set(auth()).send({ quantity: 500, unit: 'g' });
    const p = await createProduct(4);
    const recipe = await http.post('/api/recipes').set(auth()).send({
      name: unique('Ficha'),
      yield: 20,
      yieldType: 'UN',
      margin: 1.5,
      overhead: 0,
      labor: 0,
      linkProductId: p.id,
      ingredients: [{ name: 'Leite', ingredientId: ing.body.id, quantity: 395, unit: 'g', packageQuantity: 395, packUnit: 'g', cost: 7.5 }],
    });
    expect(recipe.status).to.equal(201);

    // 40 brigadeiros = 790 g; tem 500 g -> faltam 290 g
    await createOrder({ deposit: 0, deliveryAt: inDays(2), items: [{ productId: p.id, quantity: 40 }] });
    const res = await http.get(`/api/orders/needs?from=${inDays(0, 0)}&to=${inDays(7, 0)}`).set(auth());
    expect(res.status).to.equal(200);
    const item = res.body.ingredients.find((i) => i.ingredientId === ing.body.id);
    expect(item).to.include({ needed: 790, stockQuantity: 500, missing: 290, tracked: true, stockUnit: 'g' });
    expect(res.body.shortages.map((s) => s.ingredientId)).to.include(ing.body.id);
  });

  it('ENC-009 | Outro usuário não vê nem altera a encomenda', async () => {
    const p = await createProduct();
    const order = (await createOrder({ deposit: 0, items: [{ productId: p.id, quantity: 1 }] })).body;
    expect((await http.get(`/api/orders/${order.id}`).set(auth(otherToken))).status).to.be.oneOf([403, 404]);
    expect((await http.post(`/api/orders/${order.id}/status`).set(auth(otherToken)).send({ status: 'CANCELED' })).status).to.be.oneOf([403, 404]);
    const list = await http.get('/api/orders').set(auth(otherToken));
    expect(list.body.map((o) => o.id)).to.not.include(order.id);
    expect((await http.get('/api/orders')).status).to.equal(401);
  });
});
