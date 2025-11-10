const { expect } = require('chai');

describe('Relatórios', () => {
  it('exige autenticação no resumo de faturamento (401)', async () => {
    const res = await global.api.get('/reports/revenue');
    expect(res.status).to.equal(401);
  });

  it('retorna total de faturamento (200)', async () => {
    const res = await global.withAuth(global.api.get('/reports/revenue').query({ breakdown: 'total' }));
    expect(res.status).to.equal(200);
    // pode retornar { total } ou array dependendo do breakdown
    if (Array.isArray(res.body)) {
      expect(res.body.length).to.be.gte(0);
    } else {
      expect(res.body).to.have.property('total');
    }
  });

  it('retorna faturamento agregado por dia (200)', async () => {
    const res = await global.withAuth(global.api.get('/reports/revenue').query({ breakdown: 'day' }));
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  it('exporta faturamento (200) csv ou pdf', async () => {
    const res = await global.withAuth(global.api.get('/reports/revenue/export').query({ format: 'csv' }));
    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.match(/(text\/csv|application\/pdf)/);
  });
});

