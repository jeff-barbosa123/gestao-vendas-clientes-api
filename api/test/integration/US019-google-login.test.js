const crypto = require('crypto');
const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { pool } = require('../../src/db');
const googleAuth = require('../../src/services/auth/googleAuth');

const AUTH = '/api/auth';
const uniq = () => `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
const cookieOf = (res, name) => {
  const raw = (res.headers['set-cookie'] || []).find((c) => c.startsWith(`${name}=`));
  return raw ? raw.split(';')[0].slice(name.length + 1) : null;
};

describe('US019 - Login com Google (OAuth 2.0 + PKCE)', () => {
  let http;
  let ipSeq = 0;
  const ip = () => `10.19.0.${(ipSeq++ % 250) + 1}`;
  const original = {};
  let claimsToReturn;

  before(() => {
    http = getClient();
    ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'].forEach((k) => (original[k] = process.env[k]));
    process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
    original.getClaims = googleAuth.deps.getClaims;
    googleAuth.deps.getClaims = async () => claimsToReturn;
  });

  after(() => {
    Object.entries(original).forEach(([k, v]) => {
      if (k === 'getClaims') googleAuth.deps.getClaims = v;
      else if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });
  });

  // Inicia o fluxo e devolve o cookie de estado + state valido.
  const start = async () => {
    const res = await http.get(`${AUTH}/google`).set('x-forwarded-for', ip()).redirects(0);
    const url = new URL(res.headers.location);
    return { res, url, cookie: cookieOf(res, 'sgvc_oauth') };
  };
  const callback = (cookie, query) =>
    http
      .get(`${AUTH}/google/callback?${new URLSearchParams(query)}`)
      .set('Cookie', cookie ? `sgvc_oauth=${cookie}` : '')
      .set('x-forwarded-for', ip())
      .redirects(0);

  it('GOOGLE-001 | /providers indica se o Google esta configurado', async () => {
    const on = await http.get(`${AUTH}/providers`).set('x-forwarded-for', ip());
    expect(on.body).to.deep.equal({ google: true });
    const prev = process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_SECRET;
    const off = await http.get(`${AUTH}/providers`).set('x-forwarded-for', ip());
    process.env.GOOGLE_CLIENT_SECRET = prev;
    expect(off.body).to.deep.equal({ google: false });
    const start404 = await http.get(`${AUTH}/google`).set('x-forwarded-for', ip()).set('Cookie', '').redirects(0);
    expect(start404.status).to.equal(302); // reconfigurado: volta a funcionar
  });

  it('GOOGLE-002 | Inicio redireciona ao Google com state, nonce e PKCE S256 + cookie HttpOnly', async () => {
    const { res, url, cookie } = await start();
    expect(res.status).to.equal(302);
    expect(url.origin + url.pathname).to.equal('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('response_type')).to.equal('code');
    expect(url.searchParams.get('scope')).to.equal('openid email profile');
    expect(url.searchParams.get('code_challenge_method')).to.equal('S256');
    const [state, verifier, nonce] = cookie.split('.');
    expect(url.searchParams.get('state')).to.equal(state);
    expect(url.searchParams.get('nonce')).to.equal(nonce);
    expect(url.searchParams.get('code_challenge')).to.equal(
      crypto.createHash('sha256').update(verifier).digest('base64url')
    );
    const setCookie = res.headers['set-cookie'].find((c) => c.startsWith('sgvc_oauth='));
    expect(setCookie).to.match(/HttpOnly/i);
    expect(setCookie).to.match(/SameSite=Lax/i);
  });

  it('GOOGLE-003 | Callback rejeita state invalido, ausente ou cancelamento', async () => {
    const { cookie } = await start();
    expect((await callback(cookie, { code: 'x', state: 'errado' })).headers.location).to.equal('/?google_error=invalid_state');
    expect((await callback(null, { code: 'x', state: 'x' })).headers.location).to.equal('/?google_error=invalid_state');
    const fresh = await start();
    expect((await callback(fresh.cookie, { error: 'access_denied' })).headers.location).to.equal('/?google_error=cancelled');
  });

  it('GOOGLE-004 | Novo usuario Google e criado sem senha, e-mail verificado, e recebe sessao por cookie', async () => {
    const email = `novo.google+${uniq()}@teste.com`;
    claimsToReturn = { sub: `sub-${uniq()}`, email, email_verified: true, name: 'Pessoa Google' };
    const { url, cookie } = await start();
    const res = await callback(cookie, { code: 'abc', state: url.searchParams.get('state') });
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal('/dashboard.html');
    expect(cookieOf(res, 'sgvc_token')).to.be.a('string').and.not.empty;
    expect(cookieOf(res, 'sgvc_refresh')).to.be.a('string').and.not.empty;
    const row = (await pool.query('SELECT password, email_verified, auth_provider, google_sub, name FROM users WHERE email = $1', [email])).rows[0];
    expect(row.password).to.equal(null);
    expect(row.email_verified).to.equal(true);
    expect(row.auth_provider).to.equal('google');
    expect(row.google_sub).to.equal(claimsToReturn.sub);
    // sessao funciona
    const me = await http.get(`${AUTH}/me`).set('Cookie', `sgvc_token=${cookieOf(res, 'sgvc_token')}`).set('x-forwarded-for', ip());
    expect(me.status).to.equal(200);
    expect(me.body.email || (me.body.user && me.body.user.email)).to.equal(email);
  });

  it('GOOGLE-005 | Segundo login com o mesmo sub reaproveita o usuario (sem duplicar)', async () => {
    const email = `repetido+${uniq()}@teste.com`;
    claimsToReturn = { sub: `sub-${uniq()}`, email, email_verified: true, name: 'Repetido' };
    for (let i = 0; i < 2; i++) {
      const { url, cookie } = await start();
      const res = await callback(cookie, { code: 'abc', state: url.searchParams.get('state') });
      expect(res.headers.location).to.equal('/dashboard.html');
    }
    const count = (await pool.query('SELECT count(*)::int AS n FROM users WHERE email = $1', [email])).rows[0].n;
    expect(count).to.equal(1);
  });

  it('GOOGLE-006 | Conta local existente com o mesmo e-mail e vinculada (mantem senha e dados)', async () => {
    const email = `local+${uniq()}@teste.com`;
    const password = 'Local@12345';
    const reg = await http.post(`${AUTH}/register`).set('x-forwarded-for', ip()).send({ email, password, name: 'Local User' });
    expect(reg.status).to.be.oneOf([200, 201]);
    const before = (await pool.query('SELECT id, password FROM users WHERE email = $1', [email])).rows[0];
    claimsToReturn = { sub: `sub-${uniq()}`, email: email.toUpperCase(), email_verified: true, name: 'Outro Nome' };
    const { url, cookie } = await start();
    const res = await callback(cookie, { code: 'abc', state: url.searchParams.get('state') });
    expect(res.headers.location).to.equal('/dashboard.html');
    const after = (await pool.query('SELECT id, password, google_sub, name FROM users WHERE email = $1', [email])).rows[0];
    expect(after.id).to.equal(before.id);
    expect(after.password).to.equal(before.password);
    expect(after.google_sub).to.equal(claimsToReturn.sub);
    expect(after.name).to.equal('Local User');
  });

  it('GOOGLE-007 | E-mail nao verificado pelo Google e rejeitado', async () => {
    claimsToReturn = { sub: `sub-${uniq()}`, email: `nv+${uniq()}@teste.com`, email_verified: false, name: 'NV' };
    const { url, cookie } = await start();
    const res = await callback(cookie, { code: 'abc', state: url.searchParams.get('state') });
    expect(res.headers.location).to.equal('/?google_error=email_not_verified');
    expect(cookieOf(res, 'sgvc_token')).to.equal(null);
  });

  it('GOOGLE-008 | Usuario bloqueado nao entra via Google', async () => {
    const email = `bloq+${uniq()}@teste.com`;
    claimsToReturn = { sub: `sub-${uniq()}`, email, email_verified: true, name: 'Bloq' };
    let flow = await start();
    await callback(flow.cookie, { code: 'abc', state: flow.url.searchParams.get('state') });
    await pool.query('UPDATE users SET blocked = TRUE WHERE email = $1', [email]);
    flow = await start();
    const res = await callback(flow.cookie, { code: 'abc', state: flow.url.searchParams.get('state') });
    expect(res.headers.location).to.equal('/?google_error=blocked');
    expect(cookieOf(res, 'sgvc_token')).to.equal(null);
  });

  it('GOOGLE-009 | Conta somente-Google nao autentica por senha (sem 500)', async () => {
    const email = `semsenha+${uniq()}@teste.com`;
    claimsToReturn = { sub: `sub-${uniq()}`, email, email_verified: true, name: 'Sem Senha' };
    const { url, cookie } = await start();
    await callback(cookie, { code: 'abc', state: url.searchParams.get('state') });
    for (const password of ['Qualquer@123', 'null']) {
      const res = await http.post(`${AUTH}/login`).set('x-forwarded-for', ip()).send({ email, password });
      expect(res.status, password).to.equal(401);
    }
  });

  it('GOOGLE-010 | Estado e de uso unico: cookie e consumido no callback', async () => {
    claimsToReturn = { sub: `sub-${uniq()}`, email: `uso+${uniq()}@teste.com`, email_verified: true, name: 'Uso' };
    const { url, cookie } = await start();
    const res = await callback(cookie, { code: 'abc', state: url.searchParams.get('state') });
    const cleared = res.headers['set-cookie'].find((c) => c.startsWith('sgvc_oauth='));
    expect(cleared).to.match(/Expires=Thu, 01 Jan 1970/i);
  });
});
