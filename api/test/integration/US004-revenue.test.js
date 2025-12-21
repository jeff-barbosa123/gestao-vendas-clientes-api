const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetSession } = require('../utils/authHelper');
const { toWeekKeyUTC } = require('../../src/utils/dateValidation');

const REVENUE_PATH = '/api/reports/revenue';
const EXPORT_PATH = '/api/reports/revenue/export';
const SALES_PATH = '/api/sales';
const PRODUCTS_PATH = '/api/products';
const CUSTOMERS_PATH = '/api/customers';

const buildQuery = (params = {}) => {
  const entries = Object.entries(params)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return entries.length ? `?${entries.join('&')}` : '';
};

const parseCsvTotals = (csvBody) => {
  const lines = String(csvBody || '').trim().split('\n');
  if (lines.length <= 1) return [];
  return lines.slice(1).map((line) => {
    const [period, total] = line.split(',');
    return { period, total: Number(total) };
  });
};

describe('US004 - Faturamento', () => {
  let client;
  let token;
  let otherUser;
  let customerId;
  let revenueCount = 0;
  const seedSales = [];

  const authHeaders = (t) => ({ Authorization: `Bearer ${t}` });

  const revenueGet = (query, authToken = token, ip) =>
    client
      .get(`${REVENUE_PATH}${query || ''}`)
      .set(authHeaders(authToken))
      .set('x-forwarded-for', ip || `10.0.1.${++revenueCount}`);

  const exportGet = (query, ip) =>
    client
      .get(`${EXPORT_PATH}${query || ''}`)
      .set(authHeaders(token))
      .set('x-forwarded-for', ip || `10.0.2.${++revenueCount}`);

  const createCustomer = async () => {
    const res = await client
      .post(CUSTOMERS_PATH)
      .set(authHeaders(token))
      .send({
        name: 'Cliente Receita',
        email: `revenue+${Date.now()}@teste.com`,
        phone: '11999990000',
      });
    return res.body.id;
  };

  const createProduct = async () => {
    const res = await client
      .post(PRODUCTS_PATH)
      .set(authHeaders(token))
      .send({
        name: `Produto Receita ${Date.now()}`,
        price: 100,
        purchase_price: 40,
        stock: 10,
      });
    return res.body.id;
  };

  const createSale = async ({ date, unitPrice, quantity = 1, productId }) => {
    const res = await client
      .post(SALES_PATH)
      .set(authHeaders(token))
      .send({
        customerId,
        items: [{ productId, quantity, unitPrice }],
        paymentMethod: 'PIX',
        date,
      });
    seedSales.push({ id: res.body.id, date, total: res.body.total, status: 'ACTIVE' });
    return res.body;
  };

  const cancelSale = async (saleId) => {
    await client
      .post(`${SALES_PATH}/${saleId}/cancel`)
      .set(authHeaders(token));
    const sale = seedSales.find((item) => item.id === saleId);
    if (sale) sale.status = 'CANCELED';
  };

  const sumSales = (predicate) =>
    seedSales
      .filter((sale) => sale.status === 'ACTIVE' && predicate(sale))
      .reduce((sum, sale) => sum + sale.total, 0);

  before(async () => {
    client = getClient();
    const adminSession = await loginAndGetSession('admin');
    const otherSession = await loginAndGetSession('other');
    token = adminSession.token;
    otherUser = otherSession.user;
    expect(token).to.be.a('string');

    customerId = await createCustomer();
    const productId = await createProduct();

    const dayTarget = '2099-03-10';
    const active = await createSale({ date: dayTarget, unitPrice: 100, productId });
    const canceled = await createSale({ date: dayTarget, unitPrice: 50, productId });
    await cancelSale(canceled.id);

    await createSale({ date: '2099-03-11', unitPrice: 200, productId });
    await createSale({ date: '2099-03-20', unitPrice: 300, productId });
    await createSale({ date: '2099-04-05', unitPrice: 400, productId });
    await createSale({ date: '2098-12-31', unitPrice: 500, productId });

    expect(active.id).to.be.a('string');
  });

  it('API-REP-001 | Deve consultar faturamento total', async () => {
    const resp = await revenueGet('');

    expect(resp.status).to.equal(200);
    expect(resp.body).to.have.property('total');
  });

  it('API-REP-002 | Deve retornar um total numerico', async () => {
    const resp = await revenueGet('');

    expect(resp.status).to.equal(200);
    expect(resp.body.total).to.be.a('number');
  });

  it('API-REP-003 | Deve ignorar vendas canceladas no calculo do faturamento', async () => {
    const day = '2099-03-10';
    const expected = sumSales((sale) => sale.date === day);

    const resp = await revenueGet(buildQuery({ day }));

    expect(resp.status).to.equal(200);
    expect(resp.body.total).to.equal(Number(expected.toFixed(2)));
  });

  it('API-REP-004 | Deve permitir filtro diario valido retornando 200', async () => {
    const day = '2099-03-11';
    const expected = sumSales((sale) => sale.date === day);

    const resp = await revenueGet(buildQuery({ day }));

    expect(resp.status).to.equal(200);
    expect(resp.body.total).to.equal(Number(expected.toFixed(2)));
  });

  it('API-REP-005 | Deve permitir filtro semanal valido (ISO-8601) retornando 200', async () => {
    const week = toWeekKeyUTC(new Date(Date.UTC(2099, 2, 10)));
    const expected = sumSales((sale) => {
      const weekKey = toWeekKeyUTC(new Date(`${sale.date}T00:00:00Z`));
      return weekKey === week;
    });

    const resp = await revenueGet(buildQuery({ week }));

    expect(resp.status).to.equal(200);
    expect(resp.body.total).to.equal(Number(expected.toFixed(2)));
  });

  it('API-REP-006 | Deve permitir filtro mensal valido retornando 200', async () => {
    const month = '2099-03';
    const expected = sumSales((sale) => sale.date.startsWith(month));

    const resp = await revenueGet(buildQuery({ month }));

    expect(resp.status).to.equal(200);
    expect(resp.body.total).to.equal(Number(expected.toFixed(2)));
  });

  it('API-REP-007 | Deve permitir filtro anual valido retornando 200', async () => {
    const year = '2099';
    const expected = sumSales((sale) => sale.date.startsWith(year));

    const resp = await revenueGet(buildQuery({ year }));

    expect(resp.status).to.equal(200);
    expect(resp.body.total).to.equal(Number(expected.toFixed(2)));
  });

  it('API-REP-008 | Deve rejeitar intervalo com data inicial maior que a final retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ start: '2099-03-10', end: '2099-03-01' }));

    expect(resp.status).to.equal(400);
  });

  it('API-REP-009 | Deve rejeitar periodo excessivamente longo retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ start: '2098-01-01', end: '2100-02-01' }));

    expect(resp.status).to.equal(400);
  });

  it('API-REP-010 | Deve rejeitar uso de mais de um filtro temporal retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ day: '2099-03-10', month: '2099-03' }));

    expect(resp.status).to.equal(400);
  });

  it('API-REP-011 | Deve rejeitar data em formato invalido retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ day: '10-03-2099' }));

    expect(resp.status).to.equal(400);
  });

  it('API-REP-012 | Deve rejeitar data com caracteres invalidos retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ day: '2099-03-1a' }));

    expect(resp.status).to.equal(400);
  });

  it('API-REP-013 | Deve rejeitar data inexistente retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ day: '2099-02-31' }));

    expect(resp.status).to.equal(400);
  });

  it('API-REP-014 | Deve rejeitar 29/02 em ano nao bissexto retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ day: '2099-02-29' }));

    expect(resp.status).to.equal(400);
  });

  it('API-REP-015 | Deve aceitar 29/02 em ano bissexto retornando 200', async () => {
    const resp = await revenueGet(buildQuery({ day: '2096-02-29' }));

    expect(resp.status).to.equal(200);
  });

  it('API-REP-016 | Deve rejeitar semana invalida retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ week: '2099-W00' }));

    expect(resp.status).to.equal(400);
  });

  it('API-REP-017 | Deve rejeitar mes invalido retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ month: '2099-13' }));

    expect(resp.status).to.equal(400);
  });

  it('API-REP-018 | Deve rejeitar timezone invalido retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ timezone: 'Invalid@@Zone' }));

    expect(resp.status).to.equal(400);
  });

  it('API-REP-019 | Deve garantir idempotencia retornando o mesmo total', async () => {
    const query = buildQuery({ day: '2099-03-10' });
    const first = await revenueGet(query);
    const second = await revenueGet(query);

    expect(first.status).to.equal(200);
    expect(second.status).to.equal(200);
    expect(first.body.total).to.equal(second.body.total);
  });

  it('API-REP-020 | Deve garantir determinismo entre consulta e exportacao', async () => {
    const query = buildQuery({ breakdown: 'total', month: '2099-03' });
    const resp = await revenueGet(query);
    const exportResp = await exportGet(`${query}&format=csv`, '10.0.0.11');

    expect(resp.status).to.equal(200);
    expect(exportResp.status).to.equal(200);

    const rows = parseCsvTotals(exportResp.text);
    expect(rows).to.have.lengthOf(1);
    expect(rows[0].total).to.equal(resp.body.total);
  });

  it('API-REP-021 | Deve exportar faturamento em CSV retornando 200', async () => {
    const resp = await exportGet(buildQuery({ format: 'csv', breakdown: 'total' }), '10.0.0.12');

    expect(resp.status).to.equal(200);
    expect(resp.headers['content-type']).to.include('text/csv');
  });

  it('API-REP-022 | Deve exportar faturamento em PDF retornando 200', async () => {
    const resp = await exportGet(buildQuery({ format: 'pdf', breakdown: 'total' }), '10.0.0.13');

    expect(resp.status).to.equal(200);
    expect(resp.headers['content-type']).to.include('application/pdf');
  });

  it('API-REP-023 | Deve exportar faturamento em Excel retornando 200', async () => {
    const resp = await exportGet(buildQuery({ format: 'excel', breakdown: 'total' }), '10.0.0.14');

    expect(resp.status).to.equal(200);
    expect(resp.headers['content-type']).to.include('application/vnd.ms-excel');
  });

  it('API-REP-024 | Deve rejeitar exportacao com filtro invalido retornando 400', async () => {
    const resp = await exportGet(buildQuery({ format: 'csv', week: '2099-W99' }), '10.0.0.15');

    expect(resp.status).to.equal(400);
  });

  it('API-REP-025 | Deve garantir exportacao consistente com a consulta', async () => {
    const query = buildQuery({ breakdown: 'day', month: '2099-03' });
    const resp = await revenueGet(query);
    const exportResp = await exportGet(`${query}&format=csv`, '10.0.0.16');

    expect(resp.status).to.equal(200);
    expect(exportResp.status).to.equal(200);

    const csvRows = parseCsvTotals(exportResp.text);
    expect(Array.isArray(resp.body)).to.equal(true);
    expect(csvRows.length).to.equal(resp.body.length);
    resp.body.forEach((row) => {
      const csvRow = csvRows.find((item) => item.period === row.period);
      expect(csvRow).to.exist;
      expect(csvRow.total).to.equal(row.total);
    });
  });

  it('API-REP-026 | Deve bloquear exportacoes acima do limite retornando 429', async () => {
    const ip = '10.0.0.99';
    const query = buildQuery({ format: 'csv', breakdown: 'total' });
    const first = await exportGet(query, ip);
    const second = await exportGet(query, ip);
    const third = await exportGet(query, ip);
    const fourth = await exportGet(query, ip);

    expect(first.status).to.equal(200);
    expect(second.status).to.equal(200);
    expect(third.status).to.equal(200);
    expect(fourth.status).to.equal(429);
  });

  it('SEC-REP-001 | Deve bloquear acesso ao faturamento com token invalido retornando 401', async () => {
    const resp = await client
      .get(REVENUE_PATH)
      .set('Authorization', 'Bearer token_invalido')
      .set('x-forwarded-for', '10.0.3.1');

    expect(resp.status).to.equal(401);
  });

  it('SEC-REP-002 | Deve bloquear acesso ao faturamento com token expirado retornando 401', async () => {
    const expired = process.env.EXPIRED_TOKEN || 'token_expirado_mock';
    const resp = await client
      .get(REVENUE_PATH)
      .set('Authorization', `Bearer ${expired}`)
      .set('x-forwarded-for', '10.0.3.2');

    expect(resp.status).to.equal(401);
  });

  it('SEC-REP-003 | Deve bloquear acesso ao faturamento sem token retornando 401', async () => {
    const resp = await client
      .get(REVENUE_PATH)
      .set('x-forwarded-for', '10.0.3.3');
    expect(resp.status).to.equal(401);
  });

  it('SEC-REP-004 | Deve bloquear enumeracao de parametros retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ breakdown: 'invalid' }));

    expect(resp.status).to.equal(400);
  });

  it('SEC-REP-005 | Deve bloquear SQL Injection nos filtros retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ day: '2099-03-10;DROP TABLE sales' }));

    expect(resp.status).to.equal(400);
  });

  it('SEC-REP-006 | Deve bloquear XSS nos parametros retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ day: '<script>alert(1)</script>' }));

    expect(resp.status).to.equal(400);
  });

  it('SEC-REP-007 | Deve bloquear flood de requisicoes retornando 429', async () => {
    const ip = '10.0.9.9';
    const query = buildQuery({ day: '2099-03-11' });
    let lastStatus = 200;
    for (let i = 0; i < 70; i += 1) {
      const resp = await client
        .get(`${REVENUE_PATH}${query}`)
        .set(authHeaders(token))
        .set('x-forwarded-for', ip);
      lastStatus = resp.status;
      if (lastStatus === 429) break;
    }

    expect(lastStatus).to.equal(429);
  });

  it('SEC-REP-008 | Deve aplicar rate limit especifico para exportacoes retornando 429', async () => {
    const ip = '10.0.0.98';
    const query = buildQuery({ format: 'csv', breakdown: 'total' });
    await exportGet(query, ip);
    await exportGet(query, ip);
    await exportGet(query, ip);
    const fourth = await exportGet(query, ip);

    expect(fourth.status).to.equal(429);
  });

  it('SEC-REP-009 | Deve impedir acesso ao faturamento de outro usuario (IDOR) retornando 403', async () => {
    const resp = await revenueGet(buildQuery({ userId: otherUser.id }), token);

    expect(resp.status).to.equal(403);
  });

  it('SEC-REP-010 | Deve bloquear manipulacao de parametros retornando 400', async () => {
    const resp = await revenueGet(buildQuery({ day: '2099-03-10', start: '2099-03-01', end: '2099-03-31' }));

    expect(resp.status).to.equal(400);
  });

  it('SEC-REP-011 | Deve bloquear reutilizacao de token fora do contexto retornando 401', async () => {
    const resp = await client
      .get(REVENUE_PATH)
      .set('Authorization', 'Bearer invalid.token.context')
      .set('x-forwarded-for', '10.0.3.4');

    expect(resp.status).to.equal(401);
  });

  it('SEC-REP-012 | Deve bloquear query string excessivamente longa retornando 400', async () => {
    const longValue = 'a'.repeat(3000);
    const resp = await revenueGet(buildQuery({ day: longValue }));

    expect(resp.status).to.equal(400);
  });

  it('SEC-REP-013 | Deve bloquear exportacao massiva em curto intervalo retornando 429', async () => {
    const ip = '10.0.0.97';
    const query = buildQuery({ format: 'csv', breakdown: 'total' });
    await exportGet(query, ip);
    await exportGet(query, ip);
    await exportGet(query, ip);
    const fourth = await exportGet(query, ip);

    expect(fourth.status).to.equal(429);
  });

  it('SEC-REP-014 | Deve bloquear header Authorization malformado retornando 401', async () => {
    const resp = await client
      .get(REVENUE_PATH)
      .set('Authorization', 'Bearer')
      .set('x-forwarded-for', '10.0.3.5');

    expect(resp.status).to.equal(401);
  });

  it('SEC-REP-015 | Deve bloquear token com assinatura invalida retornando 401', async () => {
    const resp = await client
      .get(REVENUE_PATH)
      .set('Authorization', 'Bearer a.b.c')
      .set('x-forwarded-for', '10.0.3.6');

    expect(resp.status).to.equal(401);
  });

  it('SEC-REP-016 | Deve bloquear token com algoritmo alterado retornando 401', async () => {
    const algNone = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxIn0.';
    const resp = await client
      .get(REVENUE_PATH)
      .set('Authorization', `Bearer ${algNone}`)
      .set('x-forwarded-for', '10.0.3.7');

    expect(resp.status).to.equal(401);
  });

  it('SEC-REP-017 | Deve impedir uso de cache compartilhado entre usuarios', async () => {
    const resp = await revenueGet(buildQuery({ day: '2099-03-10' }));
    const cacheControl = resp.headers['cache-control'] || '';
    const vary = resp.headers.vary || '';

    expect(resp.status).to.equal(200);
    expect(cacheControl).to.include('no-store');
    expect(cacheControl).to.include('private');
    expect(vary.toLowerCase()).to.include('authorization');
  });

  it('SEC-REP-018 | Deve impedir cache poisoning em relatorios', async () => {
    const dayTotal = sumSales((sale) => sale.date === '2099-03-10');
    const monthTotal = sumSales((sale) => sale.date.startsWith('2099-03'));

    const dayResp = await revenueGet(buildQuery({ day: '2099-03-10' }));
    const monthResp = await revenueGet(buildQuery({ month: '2099-03' }));

    expect(dayResp.status).to.equal(200);
    expect(monthResp.status).to.equal(200);
    expect(dayResp.body.total).to.equal(Number(dayTotal.toFixed(2)));
    expect(monthResp.body.total).to.equal(Number(monthTotal.toFixed(2)));
  });

  it.skip('PERF-REP-001 | Deve suportar consulta de faturamento com 100 requisicoes simultaneas', async () => {});
  it.skip('PERF-REP-002 | Deve suportar consulta de faturamento com 500 requisicoes simultaneas', async () => {});
  it.skip('PERF-REP-003 | Deve suportar consulta de faturamento com 1000 requisicoes simultaneas', async () => {});
  it.skip('PERF-REP-004 | Deve manter desempenho aceitavel em consultas com filtros complexos', async () => {});
  it.skip('PERF-REP-005 | Deve manter consistencia durante consulta com registro simultaneo de vendas', async () => {});
  it.skip('PERF-REP-006 | Deve manter estabilidade durante cancelamento de vendas em massa', async () => {});
  it.skip('PERF-REP-007 | Deve suportar exportacao de faturamento com multiplos usuarios simultaneos', async () => {});
  it.skip('PERF-REP-008 | Deve exportar faturamento em CSV com grande volume de dados', async () => {});
  it.skip('PERF-REP-009 | Deve exportar faturamento em PDF com grande volume de dados', async () => {});
  it.skip('PERF-REP-010 | Deve suportar pico de consultas em curto intervalo de tempo', async () => {});
  it.skip('PERF-REP-011 | Deve manter estabilidade em consulta continua por periodo prolongado', async () => {});
  it.skip('PERF-REP-012 | Deve manter desempenho com base de dados grande', async () => {});
  it.skip('PERF-REP-013 | Deve respeitar SLA de latencia em consulta simples de faturamento', async () => {});
  it.skip('PERF-REP-014 | Deve respeitar SLA de latencia em exportacao de faturamento', async () => {});
});
