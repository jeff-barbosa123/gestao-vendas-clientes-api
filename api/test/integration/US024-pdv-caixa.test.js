const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');

const AUTH = '/api/auth';
const uniq = () => `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;

describe('US024 - Fase 5: Caixa/PDV', () => {
  let http;
  let ipSeq = 0;
  const ip = () => `10.24.0.${(ipSeq++ % 250) + 1}`;
  const password = 'Caixa@12345';
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
  let seller;
  let other;
  let prod;
  let prodNoStock;

  const newProduct = async (body) => {
    const r = await send('post', owner.token, '/api/products', { name: `PDV ${uniq()}`, ...body });
    expect(r.status, JSON.stringify(r.body)).to.equal(201);
    return r.body;
  };
  const openRegister = async (t, openingAmount = 100) => {
    const r = await send('post', t, '/api/pdv/registers/open', { openingAmount });
    expect(r.status, JSON.stringify(r.body)).to.equal(201);
    return r.body.register;
  };

  before(async () => {
    http = getClient();
    owner = await register('dono');
    other = await register('outra');
    const inv = await send('post', owner.token, '/api/team/invitations', { email: `v+${uniq()}@teste.com`, role: 'seller' });
    const t = new URL(inv.body.inviteUrl).searchParams.get('token');
    const acc = await http.post(`${AUTH}/invitations/${t}/accept`).set('x-forwarded-for', ip()).send({ name: 'Caixa', password });
    seller = { token: acc.body.token };
    prod = await newProduct({ price: 25, purchase_price: 10, stock: 20 });
    prodNoStock = await newProduct({ price: 5, purchase_price: 2 });
  });

  it('PDV-001 | vender sem caixa aberto retorna 409', async () => {
    const r = await send('post', owner.token, '/api/pdv/sales', {
      items: [{ productId: prod.id, quantity: 1 }],
      payments: [{ method: 'PIX', amount: 25 }],
    });
    expect(r.status).to.equal(409);
    expect(r.body.code).to.equal('NO_OPEN_REGISTER');
  });

  it('PDV-002 | abre caixa, segundo caixa aberto do mesmo operador retorna 409', async () => {
    const reg = await openRegister(owner.token, 100);
    expect(reg).to.include({ status: 'OPEN', openingAmount: 100, expectedCash: 100 });
    const again = await send('post', owner.token, '/api/pdv/registers/open', { openingAmount: 50 });
    expect(again.status).to.equal(409);
    const session = await get(owner.token, '/api/pdv/session');
    expect(session.body.register.id).to.equal(reg.id);
  });

  it('PDV-003 | venda com dinheiro e troco grava CMV, baixa estoque e entra no caixa', async () => {
    const r = await send('post', owner.token, '/api/pdv/sales', {
      items: [{ productId: prod.id, quantity: 2 }],
      payments: [{ method: 'DINHEIRO', amount: 60 }],
    });
    expect(r.status, JSON.stringify(r.body)).to.equal(201);
    expect(r.body.sale.total).to.equal(50);
    expect(r.body.sale.cmv).to.equal(20);
    expect(r.body.sale.profit).to.equal(30);
    expect(r.body.change).to.equal(10);
    expect(r.body.payments[0]).to.include({ method: 'CASH', amount: 50, received: 60, change: 10 });

    const saved = await get(owner.token, `/api/sales/${r.body.sale.id}`);
    expect(saved.body.cmv).to.equal(20);
    const p = await get(owner.token, `/api/products/${prod.id}`);
    expect(p.body.stock).to.equal(18);

    const session = (await get(owner.token, '/api/pdv/session')).body.register;
    expect(session).to.include({ salesCount: 1, salesTotal: 50, cmv: 20, cashSales: 50, expectedCash: 150 });
  });

  it('PDV-004 | pagamento multiplo (PIX + dinheiro) e validacoes de pagamento', async () => {
    const items = [{ productId: prod.id, quantity: 2 }]; // 50
    const bad = await send('post', owner.token, '/api/pdv/sales', { items, payments: [{ method: 'PIX', amount: 40 }] });
    expect(bad.status).to.equal(422);
    expect(bad.body.code).to.equal('PAYMENT_INSUFFICIENT');
    const noChange = await send('post', owner.token, '/api/pdv/sales', { items, payments: [{ method: 'PIX', amount: 60 }] });
    expect(noChange.status).to.equal(422);
    const invalid = await send('post', owner.token, '/api/pdv/sales', { items, payments: [{ method: 'FIADO', amount: 50 }] });
    expect(invalid.status).to.equal(422);

    const ok = await send('post', owner.token, '/api/pdv/sales', {
      items,
      payments: [{ method: 'PIX', amount: 30 }, { method: 'CASH', amount: 30 }],
    });
    expect(ok.status, JSON.stringify(ok.body)).to.equal(201);
    expect(ok.body.change).to.equal(10);
    const cash = ok.body.payments.find((p) => p.method === 'CASH');
    expect(cash).to.include({ amount: 20, received: 30, change: 10 });
    // Vendas rejeitadas nao baixam estoque: 18 - 2 = 16
    expect((await get(owner.token, `/api/products/${prod.id}`)).body.stock).to.equal(16);
  });

  it('PDV-005 | sangria e suprimento ajustam o esperado; sangria maior que o saldo e recusada', async () => {
    const session = (await get(owner.token, '/api/pdv/session')).body.register;
    const sup = await send('post', owner.token, `/api/pdv/registers/${session.id}/movements`, { type: 'SUPRIMENTO', amount: 20, reason: 'Troco' });
    expect(sup.status, JSON.stringify(sup.body)).to.equal(201);
    const san = await send('post', owner.token, `/api/pdv/registers/${session.id}/movements`, { type: 'SANGRIA', amount: 70, reason: 'Deposito' });
    expect(san.status).to.equal(201);
    // 100 + 50 + 20 (caixa das 2 vendas) + 20 - 70 = 120
    expect(san.body.register).to.include({ suprimento: 20, sangria: 70, expectedCash: 120 });
    const tooMuch = await send('post', owner.token, `/api/pdv/registers/${session.id}/movements`, { type: 'SANGRIA', amount: 500 });
    expect(tooMuch.status).to.equal(422);
    const badType = await send('post', owner.token, `/api/pdv/registers/${session.id}/movements`, { type: 'X', amount: 5 });
    expect(badType.status).to.equal(422);
  });

  it('PDV-006 | venda cancelada sai do caixa e devolve estoque', async () => {
    const r = await send('post', owner.token, '/api/pdv/sales', {
      items: [{ productId: prod.id, quantity: 1 }],
      payments: [{ method: 'CASH', amount: 25 }],
    });
    expect(r.status).to.equal(201);
    let session = (await get(owner.token, '/api/pdv/session')).body.register;
    expect(session.expectedCash).to.equal(145);
    const cancel = await send('post', owner.token, `/api/sales/${r.body.sale.id}/cancel`, {});
    expect(cancel.status).to.equal(200);
    session = (await get(owner.token, '/api/pdv/session')).body.register;
    expect(session.expectedCash).to.equal(120);
    expect(session.salesCount).to.equal(2);
  });

  it('PDV-007 | fecha o caixa com diferenca e nao reabre/fecha duas vezes', async () => {
    const session = (await get(owner.token, '/api/pdv/session')).body.register;
    const closed = await send('post', owner.token, `/api/pdv/registers/${session.id}/close`, { countedAmount: 118, note: 'Faltou troco' });
    expect(closed.status, JSON.stringify(closed.body)).to.equal(200);
    expect(closed.body.register).to.include({ status: 'CLOSED', expectedAmount: 120, countedAmount: 118, difference: -2 });
    const twice = await send('post', owner.token, `/api/pdv/registers/${session.id}/close`, { countedAmount: 118 });
    expect(twice.status).to.equal(409);
    const mov = await send('post', owner.token, `/api/pdv/registers/${session.id}/movements`, { type: 'SUPRIMENTO', amount: 5 });
    expect(mov.status).to.equal(409);
    expect((await get(owner.token, '/api/pdv/session')).body.register).to.equal(null);
    const hist = await get(owner.token, '/api/pdv/registers');
    expect(hist.body.registers.map((x) => x.id)).to.include(session.id);
  });

  it('PDV-008 | vendedor opera o caixa mas nao ve CMV, lucro nem custo', async () => {
    const reg = await openRegister(seller.token, 0);
    expect(reg).to.not.have.any.keys('cmv', 'profit');
    const r = await send('post', seller.token, '/api/pdv/sales', {
      items: [{ productId: prodNoStock.id, quantity: 3 }],
      payments: [{ method: 'DEBIT_CARD', amount: 15 }],
    });
    expect(r.status, JSON.stringify(r.body)).to.equal(201);
    expect(r.body.sale.total).to.equal(15);
    expect(JSON.stringify(r.body)).to.not.match(/cmv|profit|purchase_price/i);
    const session = (await get(seller.token, '/api/pdv/session')).body.register;
    expect(session).to.include({ salesCount: 1, salesTotal: 15 });
    expect(JSON.stringify(session)).to.not.match(/cmv|profit/i);
    // O CMV continua gravado para o dono
    const full = await get(owner.token, `/api/sales/${r.body.sale.id}`);
    expect(full.body.cmv).to.equal(6);
    // Dono (pdv:manage) ve o caixa do vendedor; vendedor nao ve caixas alheios
    const asOwner = await get(owner.token, `/api/pdv/registers/${reg.id}`);
    expect(asOwner.status).to.equal(200);
    expect(asOwner.body.register.cmv).to.equal(6);
    const ownerReg = (await openRegister(owner.token, 10)).id;
    const asSeller = await get(seller.token, `/api/pdv/registers/${ownerReg}`);
    expect(asSeller.status).to.equal(403);
  });

  it('PDV-009 | codigo de barras: define, busca por codigo/nome e rejeita duplicado', async () => {
    const code = `789${Date.now()}`.slice(0, 13);
    const set = await send('put', owner.token, `/api/pdv/products/${prod.id}/barcode`, { barcode: code });
    expect(set.status, JSON.stringify(set.body)).to.equal(200);
    const dup = await send('put', owner.token, `/api/pdv/products/${prodNoStock.id}/barcode`, { barcode: code });
    expect(dup.status).to.equal(409);
    const byCode = await get(seller.token, `/api/pdv/products?q=${code}`);
    expect(byCode.body.products[0]).to.include({ id: prod.id, barcode: code });
    expect(byCode.body.products[0]).to.not.have.property('purchase_price');
    const byName = await get(seller.token, `/api/pdv/products?q=${encodeURIComponent(prodNoStock.name)}`);
    expect(byName.body.products.map((p) => p.id)).to.include(prodNoStock.id);
    const sellerSet = await send('put', seller.token, `/api/pdv/products/${prod.id}/barcode`, { barcode: '123456' });
    expect(sellerSet.status).to.equal(403);
  });

  it('PDV-010 | isolamento entre empresas e modulo desativavel', async () => {
    const r = await send('post', other.token, '/api/pdv/registers/open', { openingAmount: 0 });
    expect(r.status).to.equal(201);
    const foreign = await send('post', other.token, '/api/pdv/sales', {
      items: [{ productId: prod.id, quantity: 1 }],
      payments: [{ method: 'PIX', amount: 25 }],
    });
    expect(foreign.status).to.equal(422);
    const off = await send('put', owner.token, '/api/company/modules', { pdv: false });
    expect(off.status, JSON.stringify(off.body)).to.equal(200);
    const blocked = await get(seller.token, '/api/pdv/session');
    expect(blocked.status).to.equal(403);
    expect(blocked.body.code).to.equal('MODULE_DISABLED');
    await send('put', owner.token, '/api/company/modules', { pdv: true });
    expect((await get(seller.token, '/api/pdv/session')).status).to.equal(200);
  });
});
