const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

// PNG 1x1 valido
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('Fase 3 - White-Label (API /api/branding)', () => {
  let http;
  let tokenA;
  let tokenB;
  const stamp = Date.now().toString(36);
  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  before(async () => {
    http = getClient();
    tokenA = await loginAndGetToken('admin');
    const email = `brand-${stamp}@teste.com`;
    const r = await http.post('/api/auth/register').send({ email, password: 'Senha@12345', name: 'Outra Empresa' });
    expect(r.status, JSON.stringify(r.body)).to.equal(201);
    const l = await http.post('/api/auth/login').send({ email, password: 'Senha@12345' });
    tokenB = l.body.token;
  });

  after(async () => {
    await http.delete('/api/branding').set(auth(tokenA));
  });

  it('BRD-001 | Sem configuracao devolve o padrao', async () => {
    const r = await http.get('/api/branding').set(auth(tokenB));
    expect(r.status).to.equal(200);
    expect(r.body).to.include({ primaryColor: '#4f46e5', backgroundColor: '#0b1220', textColor: '#f1f5f9', hasLogo: false, isDefault: true });
  });

  it('BRD-002 | Exige autenticacao (exceto theme.css)', async () => {
    expect((await http.get('/api/branding')).status).to.equal(401);
    expect((await http.put('/api/branding').send({})).status).to.equal(401);
    expect((await http.get('/api/branding/logo')).status).to.equal(401);
  });

  it('BRD-003 | Salva paleta valida e normaliza para minusculas', async () => {
    const r = await http.put('/api/branding').set(auth(tokenA)).send({
      companyName: '  Doces da Ana  ', primaryColor: '#1D4ED8', backgroundColor: '#1E3A8A', textColor: '#e2e8f0',
    });
    expect(r.status, JSON.stringify(r.body)).to.equal(200);
    expect(r.body).to.include({ companyName: 'Doces da Ana', primaryColor: '#1d4ed8', backgroundColor: '#1e3a8a', isDefault: false });
  });

  it('BRD-004 | Cor fora do formato #RRGGBB retorna 400', async () => {
    const r = await http.put('/api/branding').set(auth(tokenA)).send({ primaryColor: 'azul', backgroundColor: '#1e3a8a', textColor: '#e2e8f0' });
    expect(r.status).to.equal(400);
    expect(r.body.code).to.equal('INVALID_COLOR');
  });

  it('BRD-005 | Contraste abaixo de AA retorna 422 com detalhes', async () => {
    const r = await http.put('/api/branding').set(auth(tokenA)).send({ primaryColor: '#ffeb3b', backgroundColor: '#1e3a8a', textColor: '#e2e8f0' });
    expect(r.status).to.equal(422);
    expect(r.body.code).to.equal('CONTRAST_AA');
    expect(r.body.details[0]).to.include({ field: 'primaryColor', ok: false, min: 4.5 });
    expect(r.body.details[0].ratio).to.be.below(4.5);
  });

  it('BRD-005b | Texto escuro sobre superficie escura (contraste abaixo de AA) retorna 422', async () => {
    const r = await http.put('/api/branding').set(auth(tokenA)).send({ primaryColor: '#1d4ed8', backgroundColor: '#1e3a8a', textColor: '#111827' });
    expect(r.status).to.equal(422);
    expect(r.body.code).to.equal('CONTRAST_AA');
    expect(r.body.details.map((d) => d.field)).to.deep.equal(['textColor']);
  });

  it('BRD-006 | Configuracao e isolada por empresa', async () => {
    const b = await http.get('/api/branding').set(auth(tokenB));
    expect(b.body.isDefault).to.equal(true);
    const a = await http.get('/api/branding').set(auth(tokenA));
    expect(a.body.primaryColor).to.equal('#1d4ed8');
  });

  it('BRD-007 | theme.css reflete a paleta da empresa logada e e padrao para visitante', async () => {
    const a = await http.get('/api/branding/theme.css').set(auth(tokenA));
    expect(a.status).to.equal(200);
    expect(a.headers['content-type']).to.match(/text\/css/);
    expect(a.text).to.include('--accent: #1d4ed8;').and.include('--bg: #1e3a8a;').and.include('--accent-dark:').and.include('--accent-text:');
    const m = a.text.match(/--accent-text: (#[0-9a-f]{6});/);
    const { contrastRatio } = require('../../src/utils/contrast');
    expect(contrastRatio(m[1], '#111c33')).to.be.at.least(4.5);
    expect(contrastRatio(m[1], '#1e3a8a')).to.be.at.least(4.5);
    const visitante = await http.get('/api/branding/theme.css');
    expect(visitante.status).to.equal(200);
    expect(visitante.text).to.not.include('--accent');
    const invalido = await http.get('/api/branding/theme.css').set(auth('token-invalido'));
    expect(invalido.status).to.equal(200);
    expect(invalido.text).to.not.include('--accent');
  });

  it('BRD-007b | theme.css usa ETag: 304 sem corpo enquanto a paleta nao muda e novo ETag apos salvar', async () => {
    const first = await http.get('/api/branding/theme.css').set(auth(tokenA));
    expect(first.status).to.equal(200);
    const etag = first.headers.etag;
    expect(etag).to.match(/^"[0-9a-f]{40}"$/);
    expect(first.headers['cache-control']).to.include('private').and.include('no-cache');
    expect(first.headers.vary).to.match(/Cookie/i);

    const again = await http.get('/api/branding/theme.css').set(auth(tokenA)).set('If-None-Match', etag);
    expect(again.status).to.equal(304);
    expect(again.text || '').to.equal('');
    expect(again.headers.etag).to.equal(etag);
    expect((await http.get('/api/branding/theme.css').set(auth(tokenA)).set('If-None-Match', 'W/' + etag + ', "outro"')).status).to.equal(304);
    expect((await http.get('/api/branding/theme.css').set(auth(tokenA)).set('If-None-Match', '*')).status).to.equal(304);
    expect((await http.get('/api/branding/theme.css').set(auth(tokenA)).set('If-None-Match', '"velho"')).status).to.equal(200);

    // ETag do visitante (tema padrao) e diferente do tema da empresa e nao vaza entre sessoes
    const visitante = await http.get('/api/branding/theme.css');
    expect(visitante.headers.etag).to.not.equal(etag);
    expect((await http.get('/api/branding/theme.css').set('If-None-Match', etag)).status).to.equal(200);

    // salvar nova paleta invalida o ETag antigo
    const put = await http.put('/api/branding').set(auth(tokenA)).send({ companyName: 'Doces da Ana', primaryColor: '#0f766e', backgroundColor: '#1e3a8a', textColor: '#e2e8f0' });
    expect(put.status, JSON.stringify(put.body)).to.equal(200);
    const novo = await http.get('/api/branding/theme.css').set(auth(tokenA)).set('If-None-Match', etag);
    expect(novo.status).to.equal(200);
    expect(novo.headers.etag).to.not.equal(etag);
    expect(novo.text).to.include('--accent: #0f766e;');
    // restaura a paleta usada pelos testes seguintes
    await http.put('/api/branding').set(auth(tokenA)).send({ companyName: 'Doces da Ana', primaryColor: '#1d4ed8', backgroundColor: '#1e3a8a', textColor: '#e2e8f0' });
  });

  it('BRD-008 | Upload de logo PNG, leitura com Content-Type correto e versao na URL', async () => {
    const up = await http.post('/api/branding/logo').set(auth(tokenA)).send({ contentType: 'image/png', data: PNG_B64 });
    expect(up.status, JSON.stringify(up.body)).to.equal(200);
    expect(up.body.hasLogo).to.equal(true);
    expect(up.body.logoUrl).to.match(/^\/api\/branding\/logo\?v=\d+$/);
    const img = await http.get('/api/branding/logo').set(auth(tokenA)).buffer(true).parse((res, cb) => {
      const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(img.status).to.equal(200);
    expect(img.headers['content-type']).to.equal('image/png');
    expect(img.headers['x-content-type-options']).to.equal('nosniff');
    expect(Buffer.compare(img.body, Buffer.from(PNG_B64, 'base64'))).to.equal(0);
    expect((await http.get('/api/branding/logo').set(auth(tokenB))).status).to.equal(404);
  });

  it('BRD-009 | Rejeita arquivo que nao e imagem, SVG e tipo divergente (415)', async () => {
    const texto = Buffer.from('nao sou imagem').toString('base64');
    expect((await http.post('/api/branding/logo').set(auth(tokenA)).send({ data: texto })).status).to.equal(415);
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
    expect((await http.post('/api/branding/logo').set(auth(tokenA)).send({ contentType: 'image/svg+xml', data: svg })).status).to.equal(415);
    expect((await http.post('/api/branding/logo').set(auth(tokenA)).send({ contentType: 'image/jpeg', data: PNG_B64 })).status).to.equal(415);
  });

  it('BRD-010 | Rejeita logo maior que 512 KB (413) e base64 invalido (400)', async () => {
    const big = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(512 * 1024 + 1)]).toString('base64');
    expect((await http.post('/api/branding/logo').set(auth(tokenA)).send({ data: big })).status).to.equal(413);
    expect((await http.post('/api/branding/logo').set(auth(tokenA)).send({ data: '***' })).status).to.equal(400);
    expect((await http.post('/api/branding/logo').set(auth(tokenA)).send({})).status).to.equal(400);
  });

  it('BRD-011 | Remover logo e restaurar padrao', async () => {
    const rm = await http.delete('/api/branding/logo').set(auth(tokenA));
    expect(rm.status).to.equal(200);
    expect(rm.body.hasLogo).to.equal(false);
    expect((await http.get('/api/branding/logo').set(auth(tokenA))).status).to.equal(404);
    const reset = await http.delete('/api/branding').set(auth(tokenA));
    expect(reset.body).to.include({ isDefault: true, primaryColor: '#4f46e5' });
  });
});