const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const perms = require('../../src/services/permissions');

const AUTH = '/api/auth';
const uniq = () => `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;

describe('US021 - Fase 2: equipe, perfis, permissoes e modulos', () => {
  let http;
  let ipSeq = 0;
  const ip = () => `10.21.0.${(ipSeq++ % 250) + 1}`;
  const password = 'Equipe@12345';
  const bearer = (t) => ({ Authorization: `Bearer ${t}` });
  const get = (t, p) => http.get(p).set(bearer(t)).set('x-forwarded-for', ip());
  const send = (m, t, p, b) => http[m](p).set(bearer(t)).set('x-forwarded-for', ip()).send(b);

  let owner; // { token }
  let seller;
  let manager;
  let stockist;

  before(async () => {
    http = getClient();
    const email = `dono+${uniq()}@teste.com`;
    const reg = await http.post(`${AUTH}/register`).set('x-forwarded-for', ip()).send({ email, password, name: 'Dono Equipe' });
    expect(reg.status).to.be.oneOf([200, 201]);
    const login = await http.post(`${AUTH}/login`).set('x-forwarded-for', ip()).send({ email, password });
    owner = { token: login.body.token, email };
    const c = await send('post', owner.token, '/api/customers', { name: 'Cliente da Empresa', email: `cli+${uniq()}@teste.com`, phone: '11999999999' });
    expect(c.status, JSON.stringify(c.body)).to.equal(201);
    const p = await send('post', owner.token, '/api/products', { name: `Produto ${uniq()}`, price: 50, purchase_price: 20, stock: 5 });
    expect(p.status, JSON.stringify(p.body)).to.equal(201);
  });

  // Convida e aceita; devolve { token, userId }
  const join = async (role, name) => {
    const email = `${role}+${uniq()}@teste.com`;
    const inv = await send('post', owner.token, '/api/team/invitations', { email, role });
    expect(inv.status, JSON.stringify(inv.body)).to.equal(201);
    const token = new URL(inv.body.inviteUrl).searchParams.get('token');
    const acc = await http.post(`${AUTH}/invitations/${token}/accept`).set('x-forwarded-for', ip()).send({ name, password });
    expect(acc.status, JSON.stringify(acc.body)).to.equal(201);
    return { token: acc.body.token, userId: acc.body.user.id, email, inviteToken: token };
  };

  it('EQ-001 | matriz: papeis e permissoes coerentes', () => {
    expect(perms.permissionsOf('owner')).to.include.members(['team:manage', 'finance:view', 'branding:write']);
    expect(perms.can('manager', 'finance:view')).to.equal(true);
    expect(perms.can('manager', 'team:manage')).to.equal(false);
    expect(perms.can('seller', 'cost:view')).to.equal(false);
    expect(perms.can('seller', 'sales:write')).to.equal(true);
    expect(perms.can('stockist', 'ingredients:write')).to.equal(true);
    expect(perms.can('stockist', 'finance:view')).to.equal(false);
    expect(perms.resolveModules({ producao: false })).to.deep.equal({ producao: false, pdv: true, crm: true, encomendas: true });
  });

  it('EQ-002 | dono existente aparece como Dono em /me e na equipe', async () => {
    const me = await get(owner.token, `${AUTH}/me`);
    expect(me.body.user.role).to.equal('owner');
    expect(me.body.user.permissions).to.include('team:manage');
    expect(me.body.user.modules).to.deep.equal({ producao: true, pdv: true, crm: true, encomendas: true });
    const list = await get(owner.token, '/api/team');
    expect(list.status).to.equal(200);
    expect(list.body.members[0]).to.include({ email: owner.email, role: 'owner', isOwner: true });
    expect(list.body.roles.map((r) => r.value)).to.deep.equal(['manager', 'seller', 'stockist']);
  });

  it('EQ-003 | convite: info publica, aceite cria membro e entra na empresa', async () => {
    seller = await join('seller', 'Vendedora');
    const info = await http.get(`${AUTH}/invitations/${seller.inviteToken}`).set('x-forwarded-for', ip());
    expect(info.status).to.equal(404); // ja usado
    const me = await get(seller.token, `${AUTH}/me`);
    expect(me.body.user.role).to.equal('seller');
    expect(me.body.user.companyId).to.equal((await get(owner.token, `${AUTH}/me`)).body.user.id);
    const customers = await get(seller.token, '/api/customers');
    expect(customers.status).to.equal(200);
    expect(JSON.stringify(customers.body)).to.contain('Cliente da Empresa'); // mesma empresa
  });

  it('EQ-004 | convite: validacoes (papel, e-mail ja existente, token invalido)', async () => {
    const badRole = await send('post', owner.token, '/api/team/invitations', { email: `x+${uniq()}@teste.com`, role: 'owner' });
    expect(badRole.status).to.equal(400);
    const dup = await send('post', owner.token, '/api/team/invitations', { email: owner.email, role: 'seller' });
    expect(dup.status).to.equal(409);
    const bad = await http.get(`${AUTH}/invitations/token-inexistente`).set('x-forwarded-for', ip());
    expect(bad.status).to.equal(404);
  });

  it('EQ-005 | vendedor: sem insumos/fichas/relatorios/equipe/exportacao/marca', async () => {
    for (const p of ['/api/ingredients', '/api/recipes', '/api/reports/financial', '/api/team', '/api/export/customers', '/api/simulacao/preco/1']) {
      const res = await get(seller.token, p);
      expect(res.status, p).to.equal(403);
    }
    const brand = await send('put', seller.token, '/api/branding', { company_name: 'X' });
    expect(brand.status).to.equal(403);
    const mod = await send('put', seller.token, '/api/company/modules', { producao: false });
    expect(mod.status).to.equal(403);
    expect((await get(seller.token, '/api/customers')).status).to.equal(200);
    expect((await get(seller.token, '/api/branding')).status).to.equal(200); // todos veem a marca da empresa
  });

  it('EQ-006 | vendedor: vende, mas nao altera produtos e nao ve custo/CMV', async () => {
    const put = await send('post', seller.token, '/api/products', { name: `P ${uniq()}`, price: 10, purchase_price: 5, stock: 1 });
    expect(put.status).to.equal(403);
    const products = await get(seller.token, '/api/products');
    expect(products.status).to.equal(200);
    const itemsOf = (b) => (Array.isArray(b) ? b : b.items);
    expect(itemsOf(products.body).length).to.be.at.least(1);
    const sample = JSON.stringify(itemsOf(products.body));
    expect(sample).to.not.match(/purchase_price|custo_por_unidade|cmv_/);
    const ownerProducts = JSON.stringify(itemsOf((await get(owner.token, '/api/products')).body));
    expect(ownerProducts).to.match(/purchase_price/);
    const ovSeller = (await get(seller.token, '/api/analytics/overview')).body;
    const ovOwner = (await get(owner.token, '/api/analytics/overview')).body;
    ['cmvTotal', 'profitTotal', 'margin'].forEach((k) => {
      expect(ovSeller, k).to.not.have.property(k);
      expect(ovOwner, k).to.have.property(k);
    });
    expect(ovSeller).to.have.property('salesCount');
  });

  it('EQ-007 | gerente: opera tudo, menos equipe/marca/modulos', async () => {
    manager = await join('manager', 'Gerente');
    expect((await get(manager.token, '/api/ingredients')).status).to.equal(200);
    expect((await get(manager.token, '/api/orders')).status).to.equal(200);
    const ov = (await get(manager.token, '/api/analytics/overview')).body;
    expect(ov).to.have.property('cmvTotal');
    expect((await get(manager.token, '/api/team')).status).to.equal(403);
    expect((await send('put', manager.token, '/api/company/modules', { producao: false })).status).to.equal(403);
    expect((await send('put', manager.token, '/api/branding', { company_name: 'X' })).status).to.equal(403);
  });

  it('EQ-008 | estoquista: insumos e produtos; sem vendas, clientes e financeiro', async () => {
    stockist = await join('stockist', 'Estoquista');
    expect((await get(stockist.token, '/api/ingredients')).status).to.equal(200);
    expect((await get(stockist.token, '/api/products')).status).to.equal(200);
    expect((await get(stockist.token, '/api/sales')).status).to.equal(403);
    expect((await get(stockist.token, '/api/customers')).status).to.equal(403);
    expect((await get(stockist.token, '/api/reports/financial')).status).to.equal(403);
    const ov = (await get(stockist.token, '/api/analytics/overview')).body;
    expect(ov).to.not.have.property('cmvTotal');
  });

  it('EQ-009 | modulos opcionais: desligar producao bloqueia insumos e fichas', async () => {
    const off = await send('put', owner.token, '/api/company/modules', { producao: false, invalido: true });
    expect(off.status).to.equal(200);
    expect(off.body.modules).to.deep.equal({ producao: false, pdv: true, crm: true, encomendas: true });
    for (const p of ['/api/ingredients', '/api/recipes']) {
      const res = await get(owner.token, p);
      expect(res.status, p).to.equal(403);
      expect(res.body.code).to.equal('MODULE_DISABLED');
    }
    expect((await get(manager.token, '/api/ingredients')).status).to.equal(403);
    expect((await get(owner.token, '/api/orders')).status).to.equal(200);
    const me = await get(seller.token, `${AUTH}/me`);
    expect(me.body.user.modules.producao).to.equal(false);
    const on = await send('put', owner.token, '/api/company/modules', { producao: true });
    expect(on.body.modules.producao).to.equal(true);
    expect((await get(owner.token, '/api/ingredients')).status).to.equal(200);
  });

  it('EQ-010 | dono altera o papel de um membro', async () => {
    const ch = await send('put', owner.token, `/api/team/members/${seller.userId}`, { role: 'manager' });
    expect(ch.status).to.equal(200);
    expect((await get(seller.token, '/api/ingredients')).status).to.equal(200);
    const invalid = await send('put', owner.token, `/api/team/members/${seller.userId}`, { role: 'owner' });
    expect(invalid.status).to.equal(400);
    const self = await send('put', owner.token, `/api/team/members/${(await get(owner.token, `${AUTH}/me`)).body.user.id}`, { role: 'seller' });
    expect(self.status).to.equal(404); // o dono nao pode ser rebaixado
    await send('put', owner.token, `/api/team/members/${seller.userId}`, { role: 'seller' });
  });

  it('EQ-011 | convite pendente pode ser revogado e reenviado', async () => {
    const email = `pend+${uniq()}@teste.com`;
    const inv = await send('post', owner.token, '/api/team/invitations', { email, role: 'seller' });
    const list = await get(owner.token, '/api/team');
    expect(list.body.invitations.map((i) => i.email)).to.include(email);
    const del = await send('delete', owner.token, `/api/team/invitations/${inv.body.invitation.id}`);
    expect(del.status).to.equal(204);
    const token = new URL(inv.body.inviteUrl).searchParams.get('token');
    expect((await http.get(`${AUTH}/invitations/${token}`).set('x-forwarded-for', ip())).status).to.equal(404);
    expect((await get(owner.token, '/api/team')).body.invitations.map((i) => i.email)).to.not.include(email);
  });

  it('EQ-012 | remover membro encerra as sessoes dele', async () => {
    const del = await send('delete', owner.token, `/api/team/members/${stockist.userId}`);
    expect(del.status).to.equal(204);
    expect((await get(stockist.token, `${AUTH}/me`)).status).to.equal(401);
    const again = await send('delete', owner.token, `/api/team/members/${stockist.userId}`);
    expect(again.status).to.equal(404);
  });

  it('EQ-013 | empresas diferentes nao se enxergam', async () => {
    const email = `outra+${uniq()}@teste.com`;
    await http.post(`${AUTH}/register`).set('x-forwarded-for', ip()).send({ email, password, name: 'Outra Empresa' });
    const login = await http.post(`${AUTH}/login`).set('x-forwarded-for', ip()).send({ email, password });
    const other = await get(login.body.token, '/api/customers');
    expect(JSON.stringify(other.body)).to.not.contain('Cliente da Empresa');
    expect((await get(login.body.token, '/api/team')).body.members).to.have.length(1);
  });
});
