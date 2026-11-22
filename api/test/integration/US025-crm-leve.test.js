const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { whatsappPhone } = require('../../src/services/crmService');

const AUTH = '/api/auth';
const uniq = () => `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

describe('US025 - Fase 6: CRM leve (historico, recompra, WhatsApp)', () => {
  let http;
  let ipSeq = 0;
  const ip = () => `10.25.0.${(ipSeq++ % 250) + 1}`;
  const password = 'Crm@123456789';
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
  let prod;
  const c = {};

  const newCustomer = async (name, phone) => {
    const r = await send('post', owner.token, '/api/customers', { name, email: `${name.toLowerCase()}.${uniq()}@teste.com`, phone });
    expect(r.status, JSON.stringify(r.body)).to.equal(201);
    return r.body;
  };
  const sell = async (customer, ago, qty = 1) => {
    const r = await send('post', owner.token, '/api/sales', {
      customerId: customer.id,
      date: daysAgo(ago),
      paymentMethod: 'PIX',
      items: [{ productId: prod.id, quantity: qty }],
    });
    expect(r.status, JSON.stringify(r.body)).to.equal(201);
    return r.body;
  };
  const list = async (t, q = '') => {
    const r = await get(t, `/api/crm/customers${q}`);
    expect(r.status, JSON.stringify(r.body)).to.equal(200);
    return r.body;
  };
  const row = (body, customer) => body.customers.find((x) => x.id === customer.id);

  before(async () => {
    http = getClient();
    owner = await register('dono');
    other = await register('outra');
    const inv = await send('post', owner.token, '/api/team/invitations', { email: `v+${uniq()}@teste.com`, role: 'seller' });
    const t = new URL(inv.body.inviteUrl).searchParams.get('token');
    const acc = await http.post(`${AUTH}/invitations/${t}/accept`).set('x-forwarded-for', ip()).send({ name: 'Vend', password });
    seller = { token: acc.body.token };
    const p = await send('post', owner.token, '/api/products', { name: `Prod CRM ${uniq()}`, price: 30, purchase_price: 12 });
    prod = p.body;
    c.recompra = await newCustomer('Ana', '(81) 99999-0000');
    c.emDia = await newCustomer('Bruno', '81988887777');
    c.inativo = await newCustomer('Carla', '123');
    c.nova = await newCustomer('Davi', '');
    await sell(c.recompra, 100);
    await sell(c.recompra, 70);
    await sell(c.emDia, 10);
    await sell(c.inativo, 200);
  });

  it('CRM-001 | classifica recompra, em dia, inativo e sem compras, nessa ordem de prioridade', async () => {
    const body = await list(owner.token);
    expect(row(body, c.recompra)).to.include({ status: 'recompra', purchases: 2, spent: 60, ticketAvg: 30 });
    expect(row(body, c.recompra).avgIntervalDays).to.equal(30);
    expect(row(body, c.recompra).daysSinceLast).to.be.within(69, 70);
    expect(row(body, c.emDia).status).to.equal('em_dia');
    expect(row(body, c.inativo).status).to.equal('inativo');
    expect(row(body, c.nova)).to.include({ status: 'sem_compras', purchases: 0 });
    const order = body.customers.map((x) => x.id);
    expect(order.indexOf(c.recompra.id)).to.be.below(order.indexOf(c.inativo.id));
    expect(order.indexOf(c.inativo.id)).to.be.below(order.indexOf(c.emDia.id));
    expect(order.indexOf(c.emDia.id)).to.be.below(order.indexOf(c.nova.id));
    expect(body.counts).to.include({ recompra: 1, em_dia: 1, inativo: 1, sem_compras: 1 });
    const only = await list(owner.token, '?status=recompra');
    expect(only.customers.map((x) => x.id)).to.deep.equal([c.recompra.id]);
    expect((await get(owner.token, '/api/crm/customers?status=xx')).status).to.equal(422);
  });

  it('CRM-002 | telefone vira numero de WhatsApp (55 + DDD) ou null', async () => {
    const body = await list(owner.token);
    expect(row(body, c.recompra).whatsappPhone).to.equal('5581999990000');
    expect(row(body, c.emDia).whatsappPhone).to.equal('5581988887777');
    expect(row(body, c.inativo).whatsappPhone).to.equal(null);
    expect(whatsappPhone('+55 (11) 98888-7777')).to.equal('5511988887777');
    expect(whatsappPhone('011 3333-4444')).to.equal('551133334444');
    expect(whatsappPhone('')).to.equal(null);
  });

  it('CRM-003 | historico: compras, produtos mais comprados, anotacao e contato por WhatsApp', async () => {
    const note = await send('post', owner.token, `/api/crm/customers/${c.recompra.id}/interactions`, { kind: 'NOTE', note: 'Prefere entrega pela manha' });
    expect(note.status, JSON.stringify(note.body)).to.equal(201);
    const empty = await send('post', owner.token, `/api/crm/customers/${c.recompra.id}/interactions`, { kind: 'NOTE', note: '  ' });
    expect(empty.status).to.equal(422);
    const bad = await send('post', owner.token, `/api/crm/customers/${c.recompra.id}/interactions`, { kind: 'SMS' });
    expect(bad.status).to.equal(422);
    const wa = await send('post', owner.token, `/api/crm/customers/${c.recompra.id}/interactions`, { kind: 'WHATSAPP', note: 'Lembrete de recompra' });
    expect(wa.status).to.equal(201);

    const d = await get(owner.token, `/api/crm/customers/${c.recompra.id}`);
    expect(d.status, JSON.stringify(d.body)).to.equal(200);
    expect(d.body.customer).to.include({ id: c.recompra.id, purchases: 2 });
    expect(d.body.customer.lastContactAt).to.be.a('string');
    expect(d.body.sales).to.have.length(2);
    expect(d.body.topProducts[0]).to.include({ productId: prod.id, units: 2 });
    expect(d.body.interactions.map((i) => i.kind)).to.have.members(['NOTE', 'WHATSAPP']);
    expect(d.body.interactions.find((i) => i.kind === 'NOTE').note).to.equal('Prefere entrega pela manha');
  });

  it('CRM-004 | venda cancelada nao conta como compra', async () => {
    const sale = await sell(c.nova, 5);
    expect(row(await list(owner.token), c.nova).status).to.equal('em_dia');
    const cancel = await send('post', owner.token, `/api/sales/${sale.id}/cancel`, {});
    expect(cancel.status).to.equal(200);
    expect(row(await list(owner.token), c.nova)).to.include({ status: 'sem_compras', purchases: 0 });
  });

  it('CRM-005 | vendedor consulta e anota; nao ve CMV/lucro; empresa isolada', async () => {
    const body = await list(seller.token);
    expect(row(body, c.recompra)).to.include({ status: 'recompra' });
    expect(JSON.stringify(body)).to.not.match(/cmv|profit|purchase_price/i);
    const note = await send('post', seller.token, `/api/crm/customers/${c.emDia.id}/interactions`, { kind: 'NOTE', note: 'Pediu desconto' });
    expect(note.status).to.equal(201);
    const foreign = await get(other.token, `/api/crm/customers/${c.recompra.id}`);
    expect(foreign.status).to.equal(404);
    expect((await list(other.token)).customers).to.have.length(0);
    expect((await get(owner.token, '/api/crm/customers/nao-e-uuid')).status).to.equal(404);
  });

  it('CRM-006 | modulo CRM pode ser desligado pela empresa', async () => {
    const off = await send('put', owner.token, '/api/company/modules', { crm: false });
    expect(off.status, JSON.stringify(off.body)).to.equal(200);
    const blocked = await get(seller.token, '/api/crm/customers');
    expect(blocked.status).to.equal(403);
    expect(blocked.body.code).to.equal('MODULE_DISABLED');
    await send('put', owner.token, '/api/company/modules', { crm: true });
    expect((await get(seller.token, '/api/crm/customers')).status).to.equal(200);
  });
});
