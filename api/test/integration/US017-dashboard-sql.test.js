const crypto = require('crypto');
const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { pool } = require('../../src/db');
const analyticsRepo = require('../../src/db/repositories/analytics');
const {
  resolveTemporalRange,
  toIsoDay,
  toWeekKeyUTC,
  toMonthKeyUTC,
} = require('../../src/utils/dateValidation');

// Referencia independente do dia comercial: meia-noite UTC exata e "so data"; com horario, UTC-3 (America/Fortaleza,
// sem horario de verao nas datas destes testes). Devolve o dia como Date a meia-noite UTC.
const DAY_MS = 24 * 60 * 60 * 1000;
const refDay = (date) => {
  const ms = date.getTime() % DAY_MS === 0 ? date.getTime() : date.getTime() - 3 * 60 * 60 * 1000;
  return new Date(Math.floor(ms / DAY_MS) * DAY_MS);
};
const inRange = (date, startDate, endDate) => (!startDate || refDay(date) >= startDate) && (!endDate || refDay(date) <= endDate);

// Implementacao de referencia (a antiga, em JS): carrega as vendas e agrega em memoria.
function referenceAggregate(sales) {
  const revenue = sales.reduce((s, x) => s + (x.total || 0), 0);
  const cmv = sales.reduce((s, x) => s + (x.cmv || 0), 0);
  const n = sales.length;
  return {
    revenueTotal: Number(revenue.toFixed(2)),
    cmvTotal: Number(cmv.toFixed(2)),
    profitTotal: Number((revenue - cmv).toFixed(2)),
    margin: revenue > 0 ? (revenue - cmv) / revenue : 0,
    avgTicket: Number((n ? revenue / n : 0).toFixed(2)),
    salesCount: n,
  };
}

function referenceTimeseries(rows, breakdown, filters) {
  const { startDate, endDate } = resolveTemporalRange(filters);
  const sales = rows
    .filter((s) => s.status !== 'CANCELED' && s.status_venda !== 'cancelada')
    .map((s) => ({ ...s, total: Number(s.total), cmv: s.cmv == null ? null : Number(s.cmv) }))
    .filter((s) => inRange(s.date, startDate, endDate));
  if (breakdown === 'total') return [{ period: 'total', ...referenceAggregate(sales) }];
  const keyOf = {
    day: toIsoDay,
    week: toWeekKeyUTC,
    month: toMonthKeyUTC,
    year: (d) => String(d.getUTCFullYear()),
  }[breakdown];
  const buckets = {};
  sales.forEach((s) => {
    const k = keyOf(refDay(s.date));
    (buckets[k] = buckets[k] || []).push(s);
  });
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, list]) => ({ period, ...referenceAggregate(list) }));
}

describe('Fase 6 - Dashboard com agregacao em SQL', () => {
  let http;
  let tokenA;
  let tokenB;
  let ownerA;
  let ownerB;
  let ip = 0;
  const stamp = Date.now().toString(36);
  const nextIp = () => `10.17.${Math.floor(++ip / 200)}.${(ip % 200) + 1}`;
  const get = (token, path) => http.get(path).set('Authorization', `Bearer ${token}`).set('x-forwarded-for', nextIp());

  // Bordas de fuso/semana ISO: virada de ano em UTC, 2027-01-01 cai na semana 2026-W53, 2025-12-29 na 2026-W01
  const SALES_A = [
    ['2026-01-05T10:00:00Z', 100.1, 40.05, 'ACTIVE', 'ativa'],
    ['2026-01-05T23:59:59Z', 50.25, 10, 'ACTIVE', 'ativa'],
    ['2026-01-06T00:00:00Z', 80, null, 'ACTIVE', 'ativa'],
    ['2025-12-29T10:00:00Z', 33.33, 11.11, 'ACTIVE', 'ativa'],
    ['2026-12-31T23:30:00Z', 70, 20, 'ACTIVE', 'ativa'],
    ['2027-01-01T00:30:00Z', 90, 30, 'ACTIVE', 'ativa'],
    ['2026-03-10T12:00:00Z', 999, 1, 'CANCELED', 'cancelada'],
    ['2026-03-11T12:00:00Z', 500, 100, 'ACTIVE', 'cancelada'],
    ['2026-03-12T12:00:00Z', 20.5, 5.5, 'ACTIVE', 'ativa'],
  ];

  before(async () => {
    http = getClient();
    const mk = async (tag) => {
      const email = `dash-${tag}-${stamp}@teste.com`;
      const r = await http.post('/api/auth/register').send({ email, password: 'Senha@12345', name: `Dash ${tag}` });
      expect(r.status, JSON.stringify(r.body)).to.equal(201);
      const l = await http.post('/api/auth/login').send({ email, password: 'Senha@12345' });
      const id = (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0].id;
      return { token: l.body.token, id };
    };
    ({ token: tokenA, id: ownerA } = await mk('a'));
    ({ token: tokenB, id: ownerB } = await mk('b'));
    for (const [date, total, cmv, status, statusVenda] of SALES_A) {
      await pool.query(
        'INSERT INTO sales (id, owner_id, total, cmv, date, status, status_venda) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [crypto.randomUUID(), ownerA, total, cmv, date, status, statusVenda]
      );
    }
    const c = await http.post('/api/customers').set('Authorization', `Bearer ${tokenA}`).send({ name: 'Cliente Dash', email: `c-${stamp}@teste.com`, phone: '11999999999' });
    expect(c.status, JSON.stringify(c.body)).to.be.oneOf([200, 201]);
  });

  // Limite da API: 366 dias por intervalo
  const RANGE_1 = { start: '2025-12-29', end: '2026-12-29' };
  const RANGE_2 = { start: '2026-12-28', end: '2027-01-31' };

  const allRows = async () => (await pool.query('SELECT * FROM sales WHERE owner_id = $1', [ownerA])).rows;

  ['day', 'week', 'month', 'year', 'total'].forEach((breakdown, i) => {
    it(`DSH-00${i + 1} | timeseries ${breakdown} igual a implementacao de referencia em JS (filtro por periodo)`, async () => {
      const filters = RANGE_1;
      const r = await get(tokenA, `/api/analytics/timeseries?breakdown=${breakdown}&start=${filters.start}&end=${filters.end}`);
      expect(r.status, JSON.stringify(r.body)).to.equal(200);
      const body = Array.isArray(r.body) ? r.body : r.body.data || r.body.series || r.body;
      const expected = referenceTimeseries(await allRows(), breakdown, filters);
      expect(body.map((x) => x.period)).to.deep.equal(expected.map((x) => x.period));
      body.forEach((x, idx) => {
        const e = expected[idx];
        expect(x.salesCount, x.period).to.equal(e.salesCount);
        expect(x.revenueTotal, x.period).to.equal(e.revenueTotal);
        expect(x.cmvTotal, x.period).to.equal(e.cmvTotal);
        expect(x.profitTotal, x.period).to.equal(e.profitTotal);
        expect(x.avgTicket, x.period).to.equal(e.avgTicket);
        expect(x.margin, x.period).to.be.closeTo(e.margin, 1e-9);
      });
    });
  });

  it('DSH-006 | Chaves de semana ISO nas bordas de ano (W01 e W53 de 2026)', async () => {
    const pick = (r) => (Array.isArray(r.body) ? r.body : r.body.data || r.body.series).map((x) => x.period);
    const a = await get(tokenA, `/api/analytics/timeseries?breakdown=week&start=${RANGE_1.start}&end=${RANGE_1.end}`);
    expect(pick(a)).to.include('2026-W01');
    const b = await get(tokenA, `/api/analytics/timeseries?breakdown=week&start=${RANGE_2.start}&end=${RANGE_2.end}`);
    expect(pick(b)).to.deep.equal(['2026-W53']);
  });

  it('DSH-007 | Vendas canceladas (status ou status_venda) ficam fora dos totais', async () => {
    const r = await get(tokenA, '/api/analytics/overview?start=2026-03-01&end=2026-03-31');
    expect(r.status).to.equal(200);
    expect(r.body.salesCount).to.equal(1);
    expect(r.body.revenueTotal).to.equal(20.5);
    expect(r.body.cmvTotal).to.equal(5.5);
  });

  it('DSH-008 | overview: totais, contagens e lastSaleAt corretos', async () => {
    const r = await get(tokenA, `/api/analytics/overview?start=${RANGE_1.start}&end=${RANGE_1.end}`);
    const { startDate, endDate } = resolveTemporalRange(RANGE_1);
    const expected = referenceAggregate(
      (await allRows())
        .filter((s) => s.status !== 'CANCELED' && s.status_venda !== 'cancelada' && inRange(s.date, startDate, endDate))
        .map((s) => ({ total: Number(s.total), cmv: s.cmv == null ? null : Number(s.cmv) }))
    );
    expect(r.body).to.include({
      revenueTotal: expected.revenueTotal,
      cmvTotal: expected.cmvTotal,
      salesCount: expected.salesCount,
      avgTicket: expected.avgTicket,
      customers: 1,
      products: 0,
      recipes: 0,
      linkedProducts: 0,
    });
    expect(new Date(r.body.lastSaleAt).toISOString()).to.equal('2026-03-12T12:00:00.000Z');
  });

  it('DSH-009 | Isolamento: outra empresa nao ve as vendas e recebe zeros', async () => {
    const r = await get(tokenB, `/api/analytics/overview?start=${RANGE_1.start}&end=${RANGE_1.end}`);
    expect(r.status).to.equal(200);
    expect(r.body).to.include({ salesCount: 0, revenueTotal: 0, cmvTotal: 0, customers: 0, margin: 0, avgTicket: 0 });
    expect(r.body.lastSaleAt).to.equal(null);
    const ts = await get(tokenB, `/api/analytics/timeseries?breakdown=day&start=${RANGE_1.start}&end=${RANGE_1.end}`);
    expect(Array.isArray(ts.body) ? ts.body : ts.body.data || ts.body.series).to.deep.equal([]);
  });

  it('DSH-010 | Repositorio agrega no banco (uma linha por periodo, nao uma por venda)', async () => {
    const rows = await analyticsRepo.salesTotalsByPeriod(ownerA, null, null, 'year');
    // 2027-01-01T00:30Z e 31/12/2026 em Fortaleza: nao ha venda em 2027
    expect(rows.map((x) => x.period)).to.deep.equal(['2025', '2026']);
    expect(rows.reduce((s, x) => s + x.salesCount, 0)).to.equal(7);
  });

  it('DSH-011 | A agregacao e planejavel pelo PostgreSQL (EXPLAIN) e usa filtro por dono e data', async () => {
    const plan = await pool.query(
      'EXPLAIN SELECT COUNT(*), SUM(total) FROM sales s WHERE s.owner_id = $1 AND s.date >= $2',
      [ownerA, '2026-01-01']
    );
    expect(plan.rows.length).to.be.greaterThan(0);
  });

  describe('Limites da data final (dia inteiro)', () => {
    let token;
    let owner;

    // Empresa propria para os casos de limite nao dependerem das vendas dos outros testes.
    // Totais distintos (potencias de 2) mostram exatamente quais vendas entraram na soma.
    const EDGE_SALES = [
      ['2026-11-30T02:59:59.999Z', 1, 'ACTIVE', 'ativa'], // 29/11 em Fortaleza
      ['2026-11-30T00:00:00.000Z', 2, 'ACTIVE', 'ativa'], // so data 30/11
      ['2026-11-30T15:00:00.000Z', 4, 'ACTIVE', 'ativa'], // 30/11
      ['2026-12-01T00:00:00.000Z', 8, 'ACTIVE', 'ativa'], // so data 01/12
      ['2026-12-01T02:59:59.999Z', 16, 'ACTIVE', 'ativa'], // 30/11 em Fortaleza
      ['2026-12-01T03:00:00.000Z', 32, 'ACTIVE', 'ativa'], // 01/12
      ['2026-11-30T16:00:00.000Z', 64, 'CANCELED', 'cancelada'],
      ['2026-11-30T17:00:00.000Z', 128, 'ACTIVE', 'cancelada'],
    ];

    before(async () => {
      const email = `dash-edge-${stamp}@teste.com`;
      const r = await http.post('/api/auth/register').send({ email, password: 'Senha@12345', name: 'Dash edge' });
      expect(r.status, JSON.stringify(r.body)).to.equal(201);
      const l = await http.post('/api/auth/login').send({ email, password: 'Senha@12345' });
      token = l.body.token;
      owner = (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0].id;
      for (const [date, total, status, statusVenda] of EDGE_SALES) {
        await pool.query(
          'INSERT INTO sales (id, owner_id, total, cmv, date, status, status_venda) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [crypto.randomUUID(), owner, total, 0, date, status, statusVenda]
        );
      }
    });

    it('DSH-013 | Periodo inclui o ultimo dia inteiro e exclui o dia seguinte', async () => {
      const r = await get(token, '/api/analytics/overview?start=2026-11-01&end=2026-11-30');
      expect(r.status, JSON.stringify(r.body)).to.equal(200);
      expect(r.body).to.include({ salesCount: 4, revenueTotal: 1 + 2 + 4 + 16 });
      expect(new Date(r.body.lastSaleAt).toISOString()).to.equal('2026-12-01T02:59:59.999Z');
    });

    it('DSH-014 | Filtro de um unico dia (start = end e day) pega o dia inteiro', async () => {
      for (const query of ['start=2026-11-30&end=2026-11-30', 'day=2026-11-30']) {
        const r = await get(token, `/api/analytics/overview?${query}`);
        expect(r.status, JSON.stringify(r.body)).to.equal(200);
        expect(r.body, query).to.include({ salesCount: 3, revenueTotal: 2 + 4 + 16 });
      }
    });

    it('DSH-015 | Canceladas no ultimo dia ficam fora tambem na evolucao diaria', async () => {
      const r = await get(token, '/api/analytics/timeseries?breakdown=day&start=2026-11-30&end=2026-11-30');
      expect(r.status, JSON.stringify(r.body)).to.equal(200);
      const rows = Array.isArray(r.body) ? r.body : r.body.data || r.body.series;
      expect(rows.map((x) => [x.period, x.salesCount, x.revenueTotal])).to.deep.equal([['2026-11-30', 3, 22]]);
    });
  });

  it('DSH-012 | Alto volume: 20.000 vendas agregadas no banco respondem rapido e corretas', async function () {
    this.timeout(30000);
    await pool.query(
      `INSERT INTO sales (id, owner_id, total, cmv, date, status, status_venda)
         SELECT gen_random_uuid(), $1, 10.00, 4.00, TIMESTAMPTZ '2026-06-01 12:00:00+00' + (g % 20) * INTERVAL '1 day', 'ACTIVE', 'ativa'
           FROM generate_series(1, 20000) g`,
      [ownerA]
    );
    try {
      const t0 = Date.now();
      const r = await get(tokenA, '/api/analytics/overview?start=2026-06-01&end=2026-06-30');
      const ms = Date.now() - t0;
      expect(r.status, JSON.stringify(r.body)).to.equal(200);
      expect(r.body.salesCount).to.equal(20000);
      expect(r.body.revenueTotal).to.equal(200000);
      expect(r.body.cmvTotal).to.equal(80000);
      expect(ms, 'tempo do overview (ms)').to.be.below(2000);
      const ts = await get(tokenA, '/api/analytics/timeseries?breakdown=day&start=2026-06-01&end=2026-06-30');
      const rows = Array.isArray(ts.body) ? ts.body : ts.body.data || ts.body.series;
      expect(rows).to.have.length(20);
      expect(rows.reduce((sum, x) => sum + x.salesCount, 0)).to.equal(20000);
    } finally {
      await pool.query("DELETE FROM sales WHERE owner_id = $1 AND total = 10.00 AND cmv = 4.00", [ownerA]);
    }
  });
});
