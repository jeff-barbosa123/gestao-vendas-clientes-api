const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { pool } = require('../../src/db');
const { describeDevice } = require('../../src/utils/userAgent');

const AUTH = '/api/auth';
const uniq = () => `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;

describe('US020 - Bloco 1: sessoes, conta Google sem senha e admin da plataforma', () => {
  let http;
  let ipSeq = 0;
  const ip = () => `10.20.0.${(ipSeq++ % 250) + 1}`;
  const UA_A = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
  const UA_B = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
  const password = 'Local@12345';

  before(() => {
    http = getClient();
  });

  const newUser = async () => {
    const email = `b1+${uniq()}@teste.com`;
    const reg = await http.post(`${AUTH}/register`).set('x-forwarded-for', ip()).send({ email, password, name: 'Conta Bloco1' });
    expect(reg.status).to.be.oneOf([200, 201]);
    return email;
  };
  const login = async (email, ua) => {
    const res = await http.post(`${AUTH}/login`).set('x-forwarded-for', ip()).set('User-Agent', ua).send({ email, password });
    expect(res.status).to.equal(200);
    return res.body;
  };
  const bearer = (t) => ({ Authorization: `Bearer ${t}` });

  it('B1-001 | describeDevice resume navegador e sistema', () => {
    expect(describeDevice(UA_A)).to.equal('Chrome em Windows');
    expect(describeDevice(UA_B)).to.equal('Safari em iOS');
    expect(describeDevice('')).to.equal('Dispositivo desconhecido');
  });

  it('B1-002 | lista sessoes ativas e marca a atual', async () => {
    const email = await newUser();
    const a = await login(email, UA_A);
    await login(email, UA_B);
    const res = await http.get(`${AUTH}/sessions`).set(bearer(a.token)).set('x-forwarded-for', ip());
    expect(res.status).to.equal(200);
    expect(res.body.sessions.length).to.be.at.least(2);
    const current = res.body.sessions.filter((s) => s.current);
    expect(current).to.have.length(1);
    expect(current[0].device).to.equal('Chrome em Windows');
    expect(res.body.sessions.map((s) => s.device)).to.include('Safari em iOS');
  });

  it('B1-003 | encerrar uma sessao invalida o access token dela', async () => {
    const email = await newUser();
    const a = await login(email, UA_A);
    const b = await login(email, UA_B);
    const list = await http.get(`${AUTH}/sessions`).set(bearer(a.token)).set('x-forwarded-for', ip());
    const other = list.body.sessions.find((s) => !s.current);
    const del = await http.delete(`${AUTH}/sessions/${other.id}`).set(bearer(a.token)).set('x-forwarded-for', ip());
    expect(del.status).to.equal(204);
    const me = await http.get(`${AUTH}/me`).set(bearer(b.token)).set('x-forwarded-for', ip());
    expect(me.status).to.equal(401);
  });

  it('B1-004 | nao encerra sessao de outro usuario (404)', async () => {
    const e1 = await newUser();
    const e2 = await newUser();
    const a = await login(e1, UA_A);
    const b = await login(e2, UA_A);
    const list = await http.get(`${AUTH}/sessions`).set(bearer(b.token)).set('x-forwarded-for', ip());
    const res = await http.delete(`${AUTH}/sessions/${list.body.sessions[0].id}`).set(bearer(a.token)).set('x-forwarded-for', ip());
    expect(res.status).to.equal(404);
  });

  it('B1-005 | revoke-others mantem so a sessao atual', async () => {
    const email = await newUser();
    const a = await login(email, UA_A);
    const b = await login(email, UA_B);
    const res = await http.post(`${AUTH}/sessions/revoke-others`).set(bearer(a.token)).set('x-forwarded-for', ip());
    expect(res.status).to.equal(200);
    expect(res.body.revoked).to.be.at.least(1);
    expect((await http.get(`${AUTH}/me`).set(bearer(b.token)).set('x-forwarded-for', ip())).status).to.equal(401);
    expect((await http.get(`${AUTH}/me`).set(bearer(a.token)).set('x-forwarded-for', ip())).status).to.equal(200);
  });

  it('B1-006 | logout tambem invalida o refresh token', async () => {
    const email = await newUser();
    const a = await login(email, UA_A);
    const out = await http.post(`${AUTH}/logout`).set(bearer(a.token)).set('x-forwarded-for', ip());
    expect(out.status).to.be.oneOf([200, 204]);
    const ref = await http.post(`${AUTH}/refresh`).set('x-forwarded-for', ip()).send({ refreshToken: a.refreshToken });
    expect(ref.status).to.equal(401);
  });

  it('B1-007 | /me expoe hasPassword, authProvider e isPlatformAdmin', async () => {
    const email = await newUser();
    const a = await login(email, UA_A);
    const res = await http.get(`${AUTH}/me`).set(bearer(a.token)).set('x-forwarded-for', ip());
    const u = res.body.user || res.body;
    expect(u.hasPassword).to.equal(true);
    expect(u.authProvider).to.equal('local');
    expect(u.isPlatformAdmin).to.equal(false);
  });

  it('B1-008 | conta sem senha local recebe NO_LOCAL_PASSWORD ao trocar senha', async () => {
    const email = await newUser();
    const a = await login(email, UA_A);
    await pool.query('UPDATE users SET password = NULL, auth_provider = $2, google_sub = $3 WHERE email = $1', [email, 'google', `sub-${uniq()}`]);
    const me = await http.get(`${AUTH}/me`).set(bearer(a.token)).set('x-forwarded-for', ip());
    expect((me.body.user || me.body).hasPassword).to.equal(false);
    const res = await http
      .post(`${AUTH}/change-password`)
      .set(bearer(a.token))
      .set('x-forwarded-for', ip())
      .send({ currentPassword: 'Qualquer@123', newPassword: 'Nova@123456' });
    expect(res.status).to.equal(400);
    expect(res.body.code).to.equal('NO_LOCAL_PASSWORD');
  });

  it('B1-009 | monitoramento de erros e restrito ao admin da plataforma', async () => {
    const email = await newUser();
    const a = await login(email, UA_A);
    const denied = await http.get('/api/errors/analytics/statistics').set(bearer(a.token)).set('x-forwarded-for', ip());
    expect(denied.status).to.equal(403);
    const adm = await http
      .post(`${AUTH}/login`)
      .set('x-forwarded-for', ip())
      .send({ email: process.env.ADMIN_EMAIL || 'admin@negocio.com', password: process.env.ADMIN_PASSWORD || 'Admin@123' });
    if (adm.status !== 200) return; // credenciais do admin variam por ambiente
    const ok = await http.get('/api/errors/analytics/statistics').set(bearer(adm.body.token)).set('x-forwarded-for', ip());
    expect(ok.status).to.equal(200);
  });
});
