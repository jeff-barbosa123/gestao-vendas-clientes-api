const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');

describe('US998 - CORS', () => {
  let client;
  before(() => {
    client = getClient();
  });

  it('REG-016 | Não libera origem desconhecida (cookie de sessão não pode vazar)', async () => {
    const res = await client.get('/health').set('Origin', 'https://malicious-site.com');
    expect(res.headers['access-control-allow-origin']).to.equal(undefined);
  });

  it('REG-017 | Libera o frontend local com credenciais', async () => {
    const res = await client.get('/health').set('Origin', 'http://localhost:4000');
    expect(res.headers['access-control-allow-origin']).to.equal('http://localhost:4000');
    expect(res.headers['access-control-allow-credentials']).to.equal('true');
  });
});
