const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { pool } = require('../../src/db');
const { loadPdfBranding, drawBrandHeader } = require('../../src/services/pdfBranding');
const { renderRecipeExport } = require('../../src/services/recipes/exportRenderer');

const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
// WebP minimo valido (cabecalho RIFF....WEBP)
const WEBP_B64 = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x1a, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(24)]).toString('base64');

const RECIPE = {
  name: 'Bolo de Cenoura',
  yield: 10,
  yieldType: 'fatias',
  costIngredients: 20,
  overhead: 2,
  labor: 5,
  totalCost: 27,
  costPerUnit: 2.7,
  priceMinimum: 3,
  priceSuggested: 5,
  marginLabel: '85%',
  estimatedProfit: 23,
  ingredients: [{ name: 'Cenoura', quantity: 2, unit: 'un', unitCost: 1, totalCost: 2 }],
};

function fakeDoc() {
  const calls = [];
  const proxy = new Proxy(
    {},
    {
      get(_t, name) {
        if (name === 'page') return { margins: { left: 50, top: 50, right: 50, bottom: 50 }, width: 595, height: 842 };
        if (name === 'calls') return calls;
        return (...args) => {
          calls.push([String(name), ...args]);
          return proxy;
        };
      },
    }
  );
  return proxy;
}

describe('Fase 4 - PDFs com a marca da empresa', () => {
  let http;
  let token;
  let ownerId;
  let ip = 0;
  const stamp = Date.now().toString(36);
  const email = `pdf-${stamp}@teste.com`;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const nextIp = () => `10.9.${Math.floor(++ip / 200)}.${(ip % 200) + 1}`;

  const buf = (res, cb) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  };
  const getPdf = (path) => http.get(path).set(auth()).set('x-forwarded-for', nextIp()).buffer(true).parse(buf);
  const customersPdf = () => getPdf('/api/export/customers?format=pdf');
  const revenuePdf = () => getPdf('/api/reports/revenue/export?format=pdf&breakdown=total');

  before(async () => {
    http = getClient();
    const r = await http.post('/api/auth/register').send({ email, password: 'Senha@12345', name: 'Empresa PDF' });
    expect(r.status, JSON.stringify(r.body)).to.equal(201);
    const l = await http.post('/api/auth/login').send({ email, password: 'Senha@12345' });
    token = l.body.token;
    ownerId = (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0].id;
    const c = await http.post('/api/customers').set(auth()).send({ name: 'Cliente PDF', email: `c-${stamp}@teste.com`, phone: '11999999999' });
    expect(c.status, JSON.stringify(c.body)).to.be.oneOf([200, 201]);
  });

  describe('helper pdfBranding', () => {
    it('PDF-001 | Sem configuracao: marca desligada e cabecalho identico ao original', async () => {
      const b = await loadPdfBranding(ownerId);
      expect(b.custom).to.equal(false);
      const doc = fakeDoc();
      drawBrandHeader(doc, b, 'Lista de Clientes');
      expect(doc.calls).to.deep.equal([
        ['fontSize', 18],
        ['text', 'Lista de Clientes', { align: 'center' }],
      ]);
    });

    it('PDF-002 | Configuracao so com valores padrao continua sem marca', async () => {
      await http.put('/api/branding').set(auth()).send({ primaryColor: '#4f46e5', backgroundColor: '#3f73c8', textColor: '#0f172a' });
      expect((await loadPdfBranding(ownerId)).custom).to.equal(false);
    });

    it('PDF-003 | Com nome, logo PNG e cores: desenha logo, nome e titulo na cor primaria', async () => {
      await http.put('/api/branding').set(auth()).send({ companyName: 'Doces da Ana', primaryColor: '#1d4ed8', backgroundColor: '#1e3a8a', textColor: '#111827' });
      const up = await http.post('/api/branding/logo').set(auth()).send({ data: PNG_B64 });
      expect(up.status, JSON.stringify(up.body)).to.equal(200);
      const b = await loadPdfBranding(ownerId);
      expect(b).to.include({ custom: true, companyName: 'Doces da Ana', primary: '#1d4ed8', text: '#111827' });
      expect(Buffer.isBuffer(b.logo)).to.equal(true);
      const doc = fakeDoc();
      drawBrandHeader(doc, b, 'Ficha Tecnica');
      const names = doc.calls.map((c) => c[0]);
      expect(names).to.include('image');
      expect(doc.calls.find((c) => c[0] === 'text' && c[1] === 'Doces da Ana')).to.be.an('array');
      expect(doc.calls.filter((c) => c[0] === 'fillColor').map((c) => c[1])).to.include('#1d4ed8');
      expect(doc.calls.find((c) => c[0] === 'text' && c[1] === 'Ficha Tecnica')).to.be.an('array');
    });

    it('PDF-004 | Logo WebP nao entra no PDF (pdfkit so embute PNG/JPEG), mas o nome continua', async () => {
      const up = await http.post('/api/branding/logo').set(auth()).send({ data: WEBP_B64 });
      expect(up.status, JSON.stringify(up.body)).to.equal(200);
      const b = await loadPdfBranding(ownerId);
      expect(b.custom).to.equal(true);
      expect(b.logo).to.equal(null);
      await http.post('/api/branding/logo').set(auth()).send({ data: PNG_B64 });
    });

    it('PDF-005 | Logo corrompido nao derruba o cabecalho', () => {
      const real = new (require('pdfkit'))({ size: 'A4', margin: 50 });
      real.on('data', () => {});
      expect(() => drawBrandHeader(real, { custom: true, companyName: 'X', primary: '#1d4ed8', text: '#111827', logo: Buffer.from('lixo') }, 'Titulo')).to.not.throw();
      real.end();
    });
  });

  describe('geradores de PDF', () => {
    it('PDF-010 | Clientes, faturamento e ficha tecnica geram PDF valido com a marca', async () => {
      const cli = await customersPdf();
      expect(cli.status, cli.text).to.equal(200);
      expect(cli.headers['content-type']).to.include('application/pdf');
      expect(cli.body.subarray(0, 5).toString()).to.equal('%PDF-');

      const rev = await revenuePdf();
      expect(rev.status).to.equal(200);
      expect(rev.body.subarray(0, 5).toString()).to.equal('%PDF-');

      const rec = await renderRecipeExport(RECIPE, 'pdf', { ownerId });
      expect(rec.contentType).to.equal('application/pdf');
      expect(rec.body.subarray(0, 5).toString()).to.equal('%PDF-');
    });

    it('PDF-011 | Com logo o PDF embute a imagem (maior que o PDF sem marca)', async () => {
      const comMarca = await renderRecipeExport(RECIPE, 'pdf', { ownerId });
      const semMarca = await renderRecipeExport(RECIPE, 'pdf', {});
      expect(comMarca.body.length).to.be.greaterThan(semMarca.body.length);
    });

    it('PDF-012 | Marca e isolada por empresa: outra conta recebe o layout original', async () => {
      const outro = await pool.query('SELECT id FROM users WHERE email <> $1 AND id NOT IN (SELECT owner_id FROM company_settings) LIMIT 1', [email]);
      expect((await loadPdfBranding(outro.rows[0].id)).custom).to.equal(false);
    });

    it('PDF-013 | Restaurar padrao volta ao layout original', async () => {
      await http.delete('/api/branding').set(auth());
      expect((await loadPdfBranding(ownerId)).custom).to.equal(false);
      const rec = await renderRecipeExport(RECIPE, 'pdf', { ownerId });
      expect(rec.body.subarray(0, 5).toString()).to.equal('%PDF-');
    });
  });
});
