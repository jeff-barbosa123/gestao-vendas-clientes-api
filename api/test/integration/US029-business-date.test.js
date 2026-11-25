const crypto = require('crypto');
const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { pool } = require('../../src/db');
const { saleDay, saleDaySql } = require('../../src/utils/businessDate');

// [instante em UTC, dia comercial esperado em America/Fortaleza]
const DAY_CASES = [
  ['2026-11-01T00:00:00.000Z', '2026-11-01'], // so data
  ['2026-11-01T00:00:00.001Z', '2026-10-31'], // 1 ms depois ja e horario real
  ['2026-11-01T02:59:59.999Z', '2026-10-31'],
  ['2026-11-01T03:00:00.000Z', '2026-11-01'],
  ['2026-11-30T00:00:00.000Z', '2026-11-30'], // so data
  ['2026-11-30T02:59:59.999Z', '2026-11-29'],
  ['2026-12-01T00:00:00.000Z', '2026-12-01'], // so data
  ['2026-12-01T00:00:00.001Z', '2026-11-30'],
  ['2026-12-01T02:59:59.999Z', '2026-11-30'],
  ['2026-12-01T03:00:00.000Z', '2026-12-01'],
  ['2027-01-01T00:00:00.000Z', '2027-01-01'], // so data na virada do ano
  ['2027-01-01T02:59:59.999Z', '2026-12-31'],
  ['2027-01-01T03:00:00.000Z', '2027-01-01'],
  ['2028-02-29T00:00:00.000Z', '2028-02-29'], // bissexto, so data
  ['2028-03-01T02:59:59.999Z', '2028-02-29'],
  ['2028-03-01T03:00:00.000Z', '2028-03-01'],
];

// Cada total e uma potencia de 2: a soma mostra exatamente quais vendas entraram.
const SALES = [
  ['2026-11-01T00:00:00.000Z', 1], // so data 01/11: entra
  ['2026-11-01T02:59:59.999Z', 2], // 31/10 em Fortaleza
  ['2026-11-01T03:00:00.000Z', 4], // 01/11
  ['2026-12-01T02:59:59.999Z', 8], // 30/11
  ['2026-12-01T00:00:00.000Z', 16], // so data 01/12
  ['2026-12-01T03:00:00.000Z', 32], // 01/12
  ['2026-11-30T00:00:00.000Z', 64], // so data 30/11
  ['2026-11-30T15:00:00.000Z', 128, 'CANCELED'],
  ['2027-01-01T02:59:59.999Z', 256], // 31/12/2026
  ['2027-01-01T00:00:00.000Z', 512], // so data 01/01/2027
  ['2028-03-01T02:59:59.999Z', 1024], // 29/02/2028
  ['2028-03-01T03:00:00.000Z', 2048], // 01/03/2028
];

const NOVEMBER = 'start=2026-11-01&end=2026-11-30';
const NOVEMBER_TOTAL = 1 + 4 + 8 + 64;
const BY_DAY = [['2026-11-01', 5], ['2026-11-30', 72]];

describe('US029 - Dia comercial da venda (America/Fortaleza)', () => {
  describe('Regra em JavaScript e SQL', () => {
    it('BD-001 | JavaScript: viradas de dia, mes, ano e bissexto', () => {
      DAY_CASES.forEach(([instant, day]) => expect(saleDay(instant), instant).to.equal(day));
      expect(saleDay(null)).to.equal(null);
      expect(saleDay('data-invalida')).to.equal(null);
    });

    ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo'].forEach((sessionZone) => {
      it(`BD-002 | SQL igual ao JavaScript com a sessao do banco em ${sessionZone}`, async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN READ ONLY');
          await client.query(`SET LOCAL TIME ZONE '${sessionZone}'`);
          for (const [instant, day] of DAY_CASES) {
            const r = await client.query(`SELECT to_char(${saleDaySql('t.d')}::timestamp, 'YYYY-MM-DD') AS day FROM (SELECT $1::timestamptz AS d) t`, [instant]);
            expect(r.rows[0].day, instant).to.equal(day);
          }
        } finally {
          await client.query('ROLLBACK');
          client.release();
        }
      });
    });
  });

  describe('Dashboard, relatorios e financeiro usam o mesmo dia', () => {
    let http;
    let token;
    let ip = 0;
    const stamp = Date.now().toString(36);
    const nextIp = () => `10.29.0.${++ip}`;
    const get = async (path) => {
      const r = await http.get(path).set('Authorization', `Bearer ${token}`).set('x-forwarded-for', nextIp());
      expect(r.status, `${path} ${JSON.stringify(r.body)}`).to.equal(200);
      return r.body;
    };

    before(async () => {
      http = getClient();
      const email = `bizdate-${stamp}@teste.com`;
      const r = await http.post('/api/auth/register').send({ email, password: 'Senha@12345', name: 'Fuso' });
      expect(r.status, JSON.stringify(r.body)).to.equal(201);
      const l = await http.post('/api/auth/login').send({ email, password: 'Senha@12345' });
      token = l.body.token;
      const owner = (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0].id;
      for (const [date, total, status = 'ACTIVE'] of SALES) {
        await pool.query(
          'INSERT INTO sales (id, owner_id, total, cmv, date, status, status_venda) VALUES ($1,$2,$3,0,$4,$5,$6)',
          [crypto.randomUUID(), owner, total, date, status, status === 'CANCELED' ? 'cancelada' : 'ativa']
        );
      }
    });

    it('BD-003 | Dashboard: resumo e evolucao diaria, mensal e anual', async () => {
      const overview = await get(`/api/analytics/overview?${NOVEMBER}`);
      expect(overview).to.include({ salesCount: 4, revenueTotal: NOVEMBER_TOTAL });
      const days = await get(`/api/analytics/timeseries?breakdown=day&${NOVEMBER}`);
      expect(days.map((x) => [x.period, x.revenueTotal])).to.deep.equal(BY_DAY);
      const months = await get('/api/analytics/timeseries?breakdown=month&start=2026-10-01&end=2026-12-31');
      expect(months.map((x) => [x.period, x.revenueTotal])).to.deep.equal([['2026-10', 2], ['2026-11', NOVEMBER_TOTAL], ['2026-12', 16 + 32 + 256]]);
      const years = await get('/api/analytics/timeseries?breakdown=year&start=2026-12-31&end=2027-01-01');
      expect(years.map((x) => [x.period, x.revenueTotal])).to.deep.equal([['2026', 256], ['2027', 512]]);
    });

    it('BD-004 | Dashboard: 29/02 de ano bissexto', async () => {
      expect(await get('/api/analytics/overview?day=2028-02-29')).to.include({ salesCount: 1, revenueTotal: 1024 });
      expect(await get('/api/analytics/overview?month=2028-03')).to.include({ salesCount: 1, revenueTotal: 2048 });
    });

    it('BD-005 | Relatorio de faturamento: total e agrupamento por dia', async () => {
      expect(await get(`/api/reports/revenue?${NOVEMBER}&breakdown=total`)).to.include({ total: NOVEMBER_TOTAL, quantidadeVendas: 4 });
      const days = await get(`/api/reports/revenue?${NOVEMBER}&breakdown=day`);
      expect(days.map((x) => [x.period, x.total])).to.deep.equal(BY_DAY);
    });

    it('BD-006 | Relatorios financeiro e por forma de pagamento', async () => {
      expect(await get(`/api/reports/financial?${NOVEMBER}`)).to.include({ revenue: NOVEMBER_TOTAL, salesCount: 4 });
      const days = await get(`/api/reports/financial?${NOVEMBER}&breakdown=day`);
      expect(days.map((x) => [x.period, x.revenue])).to.deep.equal(BY_DAY);
      expect(await get(`/api/reports/payment-methods?${NOVEMBER}`)).to.include({ total: NOVEMBER_TOTAL, quantidadeVendas: 4 });
    });

    it('BD-007 | Financeiro: fluxo de caixa (dia e mes) e DRE', async () => {
      const flow = await get('/api/finance/cashflow?from=2026-11-01&to=2026-11-30&group=day');
      expect(flow.periods.map((x) => [x.period, x.salesIn])).to.deep.equal(BY_DAY);
      const monthly = await get('/api/finance/cashflow?from=2026-11-01&to=2026-11-30&group=month');
      expect(monthly.periods.map((x) => [x.period, x.salesIn])).to.deep.equal([['2026-11', NOVEMBER_TOTAL]]);
      expect(await get('/api/finance/dre?from=2026-11-01&to=2026-11-30')).to.include({ salesCount: 4, netRevenue: NOVEMBER_TOTAL });
    });
  });
});
