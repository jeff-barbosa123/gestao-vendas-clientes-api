const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');

const DOCS_RAW_PATH = '/api/docs/raw';

describe('Docs - Swagger', () => {
  it('API-DOCS-001 | Deve retornar swagger.json valido', async () => {
    const client = getClient();
    const response = await client.get(DOCS_RAW_PATH);

    expect(response.status).to.equal(200);

    const data = JSON.parse(response.text);
    expect(data).to.have.property('openapi');
    expect(data).to.have.property('paths');
    expect(data.paths).to.have.property('/reports/financial');
    expect(data.paths).to.have.property('/simulacao/preco');
  });
});
