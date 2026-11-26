const { expect } = require('chai');
const request = require('supertest');
const app = require('../../src/app');

// /metrics em producao: nega por padrao; so libera IPs de METRICS_ALLOWED_IPS.
// Usa o app em memoria (ignora BASE_URL) e o X-Forwarded-For (trust proxy = 1 salto).
describe('US028 - /metrics em producao nega por padrao', () => {
  let prevEnv;
  let prevIps;
  before(() => {
    prevEnv = process.env.NODE_ENV;
    prevIps = process.env.METRICS_ALLOWED_IPS;
    process.env.NODE_ENV = 'production';
  });
  after(() => {
    process.env.NODE_ENV = prevEnv;
    if (prevIps === undefined) delete process.env.METRICS_ALLOWED_IPS;
    else process.env.METRICS_ALLOWED_IPS = prevIps;
  });
  const get = (ip) => request(app).get('/metrics').set('X-Forwarded-Proto', 'https').set('X-Forwarded-For', ip);

  it('retorna 404 quando METRICS_ALLOWED_IPS esta vazio', async () => {
    delete process.env.METRICS_ALLOWED_IPS;
    const res = await get('203.0.113.9');
    expect(res.status).to.equal(404);
    expect(res.text || '').to.not.include('http_requests_total');
  });

  it('retorna 404 para IP fora da lista', async () => {
    process.env.METRICS_ALLOWED_IPS = '198.51.100.7, 198.51.100.8';
    const res = await get('203.0.113.9');
    expect(res.status).to.equal(404);
  });

  it('retorna 200 para IP da lista; fora de producao segue aberto', async () => {
    process.env.METRICS_ALLOWED_IPS = '198.51.100.7, 198.51.100.8';
    const ok = await get('198.51.100.8');
    expect(ok.status).to.equal(200);
    expect(ok.text).to.include('http_requests_total');

    process.env.NODE_ENV = 'test';
    delete process.env.METRICS_ALLOWED_IPS;
    const dev = await get('203.0.113.9');
    expect(dev.status).to.equal(200);
    process.env.NODE_ENV = 'production';
  });
});
