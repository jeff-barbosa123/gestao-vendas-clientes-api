const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');

const AUTH = '/api/auth';
const uniq = () => `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;

describe('US023 - Fase 4: estoque minimo e alerta de queda de margem', () => {
  let http;
  let ipSeq = 0;
  const ip = () => `10.23.0.${(ipSeq++ % 250) + 1}`;
  const password = 'Alertas@12345';
  const bearer = (t) => ({ Authorization: `Bearer ${t}` });
  const get = (t, p) => http.get(p).set(bearer(t)).set('x-forwarded-for', ip());
  const send = (m, t, p, b) => http[m](p).set(bearer(t)).set('x-forwarded-for', ip()).send(b);

  const register = async (label) => {
    const email = `${label}+${uniq()}@teste.com`;
    const reg = await http.post(`${AUTH}/register`).set('x-forwarded-for', ip()).send({ email, password, name: label });
    expect(reg.status).to.be.oneOf([200, 201]);
    const login = await http.post(`${AUTH}/login`).set('x-forwarded-for', ip()).send({ email, password });
    return { token: login.body.token };
  };

  let owner;
  let other;
  let seller;

  const newProduct = async (body) => {
    const r = await send('post', owner.token, '/api/products', { name: `P ${uniq()}`, ...body });
    expect(r.status, JSON.stringify(r.body)).to.equal(201);
    return r.body;
  };
  const overview = async (t) => {
    const r = await get(t, '/api/analytics/overview');
    expect(r.status, JSON.stringify(r.body)).to.equal(200);
    return r.body;
  };

  before(async () => {
    http = getClient();
    owner = await register('dono');
    other = await register('outra');
    const inv = await send('post', owner.token, '/api/team/invitations', { email: `v+${uniq()}@teste.com`, role: 'seller' });
    const t = new URL(inv.body.inviteUrl).searchParams.get('token');
    const acc = await http.post(`${AUTH}/invitations/${t}/accept`).set('x-forwarded-for', ip()).send({ name: 'Vend', password });
    seller = { token: acc.body.token };
  });

  it('ST-001 | produto no estoque minimo entra em productStockAlerts (dono e vendedor)', async () => {
    const p = await newProduct({ price: 20, purchase_price: 8, stock: 3, minStock: 5 });
    expect(p.minStock).to.equal(5);
    const ok = await newProduct({ price: 20, purchase_price: 8, stock: 30, minStock: 5 });
    const semMin = await newProduct({ price: 20, purchase_price: 8, stock: 1 });
    for (const t of [owner.token, seller.token]) {
      const alerts = (await overview(t)).productStockAlerts;
      expect(alerts.map((a) => a.productId)).to.include(p.id);
      expect(alerts.map((a) => a.productId)).to.not.include.members([ok.id, semMin.id]);
      expect(alerts.find((a) => a.productId === p.id)).to.include({ stock: 3, minStock: 5 });
    }
  });

  it('ST-002 | validacao: minimo/estoque inteiros >= 0; null limpa o minimo', async () => {
    const p = await newProduct({ price: 20, purchase_price: 8, stock: 2, minStock: 4 });
    expect((await send('put', owner.token, `/api/products/${p.id}`, { minStock: -1 })).status).to.equal(422);
    expect((await send('put', owner.token, `/api/products/${p.id}`, { minStock: 'abc' })).status).to.equal(422);
    expect((await send('put', owner.token, `/api/products/${p.id}`, { stock: 1.5 })).status).to.equal(422);
    const up = await send('put', owner.token, `/api/products/${p.id}`, { stock: 10 });
    expect(up.body.stock).to.equal(10);
    expect(up.body.minStock).to.equal(4);
    expect((await overview(owner.token)).productStockAlerts.map((a) => a.productId)).to.not.include(p.id);
    const cleared = await send('put', owner.token, `/api/products/${p.id}`, { minStock: null });
    expect(cleared.body.minStock).to.equal(null);
  });

  it('MG-001 | custo sobe, preco igual: alerta de queda de margem com preco sugerido', async () => {
    const p = await newProduct({ price: 100, purchase_price: 40, stock: 5 });
    expect((await overview(owner.token)).pricingAlerts.map((a) => a.productId)).to.not.include(p.id);
    const up = await send('put', owner.token, `/api/products/${p.id}`, { purchase_price: 60 });
    expect(up.status, JSON.stringify(up.body)).to.equal(200);
    const alert = (await overview(owner.token)).pricingAlerts.find((a) => a.productId === p.id);
    expect(alert).to.include({ level: 'margin_drop', price: 100, cost: 60, margin: 0.4, referenceMargin: 0.6, suggestedPrice: 150 });
    expect(alert.message).to.match(/caiu de 60% para 40%/);
  });

  it('MG-002 | aplicar o preco sugerido restaura a margem e some o alerta', async () => {
    const p = await newProduct({ price: 100, purchase_price: 40, stock: 5 });
    await send('put', owner.token, `/api/products/${p.id}`, { purchase_price: 60 });
    const sug = (await overview(owner.token)).pricingAlerts.find((a) => a.productId === p.id).suggestedPrice;
    const apply = await send('put', owner.token, `/api/products/${p.id}`, { price: sug });
    expect(apply.status).to.equal(200);
    expect((await overview(owner.token)).pricingAlerts.map((a) => a.productId)).to.not.include(p.id);
  });

  it('MG-003 | manter margem atual redefine a referencia; vendedor nao pode', async () => {
    const p = await newProduct({ price: 100, purchase_price: 40, stock: 5 });
    await send('put', owner.token, `/api/products/${p.id}`, { purchase_price: 65 });
    expect((await overview(owner.token)).pricingAlerts.find((a) => a.productId === p.id).level).to.equal('margin_drop');
    expect((await send('post', seller.token, `/api/products/${p.id}/margin-baseline`, {})).status).to.equal(403);
    const ok = await send('post', owner.token, `/api/products/${p.id}/margin-baseline`, {});
    expect(ok.status, JSON.stringify(ok.body)).to.equal(200);
    expect((await overview(owner.token)).pricingAlerts.map((a) => a.productId)).to.not.include(p.id);
  });

  it('MG-004 | vendedor nao recebe alertas de preco/margem; abaixo do custo continua valendo', async () => {
    const p = await newProduct({ price: 10, purchase_price: 30, stock: 5 });
    const mine = (await overview(owner.token)).pricingAlerts.find((a) => a.productId === p.id);
    expect(mine.level).to.equal('below_cost');
    expect(mine.suggestedPrice).to.be.greaterThan(30);
    expect((await overview(seller.token)).pricingAlerts).to.equal(undefined);
  });

  it('MG-005 | isolamento: outra empresa nao ve nem altera a referencia', async () => {
    const p = await newProduct({ price: 100, purchase_price: 40, stock: 5 });
    const r = await send('post', other.token, `/api/products/${p.id}/margin-baseline`, {});
    expect(r.status).to.be.oneOf([403, 404]);
    expect((await overview(other.token)).productStockAlerts).to.have.length(0);
  });
});
