const { expect } = require('chai');
const { securityHeaders } = require('../../src/middleware/securityHeaders');

// Render: o health check chega por HTTP na porta do servico; o resto do trafego chega com X-Forwarded-Proto.
describe('US027 - Deploy: redirect HTTPS em producao nao derruba o /health', () => {
  const run = (path, headers = {}) => {
    const out = { redirected: null, nextCalled: false };
    const req = { path, originalUrl: path, protocol: 'http', headers, get: () => 'sgvc-api.onrender.com' };
    const res = { setHeader() {}, redirect(code, url) { out.redirected = { code, url }; } };
    securityHeaders(req, res, () => { out.nextCalled = true; });
    return out;
  };
  let previous;
  before(() => { previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production'; });
  after(() => { process.env.NODE_ENV = previous; });

  it('redireciona HTTP para HTTPS em producao', () => {
    const r = run('/api/products');
    expect(r.redirected).to.deep.equal({ code: 301, url: 'https://sgvc-api.onrender.com/api/products' });
  });
  it('nao redireciona /health acessado por HTTP', () => {
    const r = run('/health');
    expect(r.redirected).to.equal(null);
    expect(r.nextCalled).to.equal(true);
  });
  it('nao redireciona quando o proxy informa HTTPS', () => {
    const r = run('/api/products', { 'x-forwarded-proto': 'https' });
    expect(r.redirected).to.equal(null);
    expect(r.nextCalled).to.equal(true);
  });
});
