const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');

const AUTH = '/api/auth';
const uniq = () => `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
const today = new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

describe('US026 - Fase 7: Financeiro (contas a pagar/receber, fluxo de caixa, DRE)', () => {
  let http;
  let ipSeq = 0;
  const ip = () => `10.26.0.${(ipSeq++ % 250) + 1}`;
  const password = 'Fin@123456789';
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
  const invite = async (owner, role) => {
    const inv = await send('post', owner.token, '/api/team/invitations', { email: `${role}+${uniq()}@teste.com`, role });
    const t = new URL(inv.body.inviteUrl).searchParams.get('token');
    const acc = await http.post(`${AUTH}/invitations/${t}/accept`).set('x-forwarded-for', ip()).send({ name: role, password });
    return { token: acc.body.token };
  };

  let owner;
  let other;
  let manager;
  let seller;

  before(async () => {
    http = getClient();
    owner = await register('dono');
    other = await register('outra');
    manager = await invite(owner, 'manager');
    seller = await invite(owner, 'seller');
  });

  it('cria conta a pagar e a receber, valida campos e isola por empresa', async () => {
    const p = await send('post', owner.token, '/api/finance/entries', { kind: 'PAYABLE', description: 'Aluguel', amount: 1200, dueDate: plusDays(5), category: 'Aluguel' });
    expect(p.status, JSON.stringify(p.body)).to.equal(201);
    expect(p.body.entries).to.have.length(1);
    expect(p.body.entries[0]).to.include({ kind: 'PAYABLE', status: 'OPEN', amount: 1200 });

    for (const bad of [
      { kind: 'X', description: 'a', amount: 1, dueDate: today },
      { kind: 'PAYABLE', description: '', amount: 1, dueDate: today },
      { kind: 'PAYABLE', description: 'a', amount: 0, dueDate: today },
      { kind: 'PAYABLE', description: 'a', amount: 1, dueDate: '2026-02-31' },
      { kind: 'PAYABLE', description: 'a', amount: 1, dueDate: today, installments: 25 },
    ]) {
      const r = await send('post', owner.token, '/api/finance/entries', bad);
      expect(r.status, JSON.stringify(bad)).to.equal(422);
    }

    const l = await get(other.token, '/api/finance/entries');
    expect(l.status).to.equal(200);
    expect(l.body.entries).to.have.length(0);
    const cross = await send('post', other.token, `/api/finance/entries/${p.body.entries[0].id}/pay`, {});
    expect(cross.status).to.equal(404);
  });

  it('parcela dividindo centavos e mantendo o total', async () => {
    const r = await send('post', owner.token, '/api/finance/entries', { kind: 'PAYABLE', description: 'Equipamento', amount: 100, dueDate: '2026-01-31', installments: 3 });
    expect(r.status, JSON.stringify(r.body)).to.equal(201);
    const e = r.body.entries;
    expect(e).to.have.length(3);
    expect(e.map((x) => x.amount)).to.deep.equal([33.34, 33.33, 33.33]);
    expect(e.map((x) => x.dueDate)).to.deep.equal(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(e[0].installmentNo).to.equal(1);
    expect(e[2].installmentTotal).to.equal(3);
  });

  it('paga, cancela e reabre respeitando os estados', async () => {
    const c = await send('post', owner.token, '/api/finance/entries', { kind: 'RECEIVABLE', description: 'Fiado Maria', amount: 80, dueDate: plusDays(2) });
    const id = c.body.entries[0].id;

    const paid = await send('post', owner.token, `/api/finance/entries/${id}/pay`, { paidAt: today, method: 'PIX' });
    expect(paid.status, JSON.stringify(paid.body)).to.equal(200);
    expect(paid.body.entry).to.include({ status: 'PAID', paidAmount: 80, method: 'PIX' });

    expect((await send('post', owner.token, `/api/finance/entries/${id}/pay`, {})).status).to.equal(409);
    expect((await send('post', owner.token, `/api/finance/entries/${id}/cancel`)).status).to.equal(409);
    expect((await send('put', owner.token, `/api/finance/entries/${id}`, { description: 'x' })).status).to.equal(409);

    const re = await send('post', owner.token, `/api/finance/entries/${id}/reopen`);
    expect(re.status).to.equal(200);
    expect(re.body.entry.status).to.equal('OPEN');

    const upd = await send('put', owner.token, `/api/finance/entries/${id}`, { description: 'Fiado Maria (ajustado)', amount: 90 });
    expect(upd.status, JSON.stringify(upd.body)).to.equal(200);
    expect(upd.body.entry.amount).to.equal(90);

    expect((await send('post', owner.token, `/api/finance/entries/${id}/cancel`)).body.entry.status).to.equal('CANCELED');
    expect((await send('post', owner.token, `/api/finance/entries/${id}/pay`, {})).status).to.equal(409);
  });

  it('marca vencidos e resume a pagar/receber', async () => {
    await send('post', owner.token, '/api/finance/entries', { kind: 'PAYABLE', description: 'Fornecedor atrasado', amount: 50, dueDate: plusDays(-3) });
    const o = await get(owner.token, '/api/finance/entries?status=OVERDUE');
    expect(o.status).to.equal(200);
    expect(o.body.entries.length).to.be.greaterThan(0);
    expect(o.body.entries.every((x) => x.status === 'OPEN' && x.overdue)).to.equal(true);

    const s = await get(owner.token, '/api/finance/summary');
    expect(s.status).to.equal(200);
    expect(s.body.payable.overdue).to.be.at.least(50);
    expect(s.body.payable.overdueCount).to.be.at.least(1);
    expect(s.body.openBalance).to.be.a('number');
  });

  it('fluxo de caixa e DRE usam vendas, CMV e lancamentos pagos', async () => {
    const prod = (await send('post', owner.token, '/api/products', { name: `Prod Fin ${uniq()}`, price: 50, purchase_price: 20 })).body;
    const sale = await send('post', owner.token, '/api/sales', { date: today, paymentMethod: 'PIX', items: [{ productId: prod.id, quantity: 2 }] });
    expect(sale.status, JSON.stringify(sale.body)).to.equal(201);

    const pay = await send('post', owner.token, '/api/finance/entries', { kind: 'PAYABLE', description: 'Energia', amount: 30, dueDate: today, category: 'Energia' });
    await send('post', owner.token, `/api/finance/entries/${pay.body.entries[0].id}/pay`, { paidAt: today });
    const rec = await send('post', owner.token, '/api/finance/entries', { kind: 'RECEIVABLE', description: 'Servico extra', amount: 10, dueDate: today });
    await send('post', owner.token, `/api/finance/entries/${rec.body.entries[0].id}/pay`, { paidAt: today });

    const q = `from=${today}&to=${today}`;
    const cf = await get(owner.token, `/api/finance/cashflow?${q}`);
    expect(cf.status, JSON.stringify(cf.body)).to.equal(200);
    expect(cf.body.totals).to.include({ salesIn: 100, receivablesIn: 10, payablesOut: 30, net: 80 });
    expect(cf.body.periods[0].cumulative).to.equal(80);

    const dre = await get(owner.token, `/api/finance/dre?${q}`);
    expect(dre.status, JSON.stringify(dre.body)).to.equal(200);
    expect(dre.body).to.include({ netRevenue: 100, cmv: 40, grossProfit: 60, otherIncome: 10, totalExpenses: 30, operatingResult: 40 });
    expect(dre.body.expenses).to.deep.equal([{ category: 'Energia', amount: 30 }]);

    expect((await get(owner.token, '/api/finance/dre?from=2026-01-01&to=2028-01-01')).status).to.equal(422);
    expect((await get(owner.token, '/api/finance/cashflow?from=2026-05-01&to=2026-04-01')).status).to.equal(422);
  });

  it('permissoes: gerente opera, vendedor recebe 403, modulo desligado bloqueia', async () => {
    expect((await send('post', manager.token, '/api/finance/entries', { kind: 'PAYABLE', description: 'Gerente', amount: 5, dueDate: today })).status).to.equal(201);
    expect((await get(manager.token, '/api/finance/summary')).status).to.equal(200);
    expect((await get(seller.token, '/api/finance/summary')).status).to.equal(403);
    expect((await get(seller.token, '/api/finance/entries')).status).to.equal(403);
    expect((await send('post', seller.token, '/api/finance/entries', { kind: 'PAYABLE', description: 'x', amount: 1, dueDate: today })).status).to.equal(403);

    const off = await send('put', owner.token, '/api/company/modules', { financeiro: false });
    expect(off.status, JSON.stringify(off.body)).to.equal(200);
    expect((await get(owner.token, '/api/finance/summary')).status).to.equal(403);
    await send('put', owner.token, '/api/company/modules', { financeiro: true });
    expect((await get(owner.token, '/api/finance/summary')).status).to.equal(200);
  });
});
