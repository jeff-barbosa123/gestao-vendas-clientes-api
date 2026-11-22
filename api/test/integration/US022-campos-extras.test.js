const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');

const AUTH = '/api/auth';
const uniq = () => `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;

describe('US022 - Fase 3: campos extras por empresa (produto/cliente)', () => {
  let http;
  let ipSeq = 0;
  const ip = () => `10.22.0.${(ipSeq++ % 250) + 1}`;
  const password = 'Extras@12345';
  const bearer = (t) => ({ Authorization: `Bearer ${t}` });
  const get = (t, p) => http.get(p).set(bearer(t)).set('x-forwarded-for', ip());
  const send = (m, t, p, b) => http[m](p).set(bearer(t)).set('x-forwarded-for', ip()).send(b);

  const register = async (label) => {
    const email = `${label}+${uniq()}@teste.com`;
    const reg = await http.post(`${AUTH}/register`).set('x-forwarded-for', ip()).send({ email, password, name: label });
    expect(reg.status).to.be.oneOf([200, 201]);
    const login = await http.post(`${AUTH}/login`).set('x-forwarded-for', ip()).send({ email, password });
    return { token: login.body.token, email };
  };

  let owner;
  let other;
  let seller;
  let product;
  let customer;

  before(async () => {
    http = getClient();
    owner = await register('dono');
    other = await register('outra');
    const inv = await send('post', owner.token, '/api/team/invitations', { email: `v+${uniq()}@teste.com`, role: 'seller' });
    const t = new URL(inv.body.inviteUrl).searchParams.get('token');
    const acc = await http.post(`${AUTH}/invitations/${t}/accept`).set('x-forwarded-for', ip()).send({ name: 'Vend', password });
    seller = { token: acc.body.token };
    const p = await send('post', owner.token, '/api/products', { name: `Prod ${uniq()}`, price: 10, purchase_price: 4, stock: 3 });
    product = p.body;
    const c = await send('post', owner.token, '/api/customers', { name: 'Cli Extra', email: `c+${uniq()}@teste.com`, phone: '11999999999' });
    customer = c.body;
  });

  it('CF-001 | dono define campos de produto; GET lista para qualquer membro', async () => {
    const put = await send('put', owner.token, '/api/custom-fields/product', {
      fields: [
        { label: 'Validade', type: 'date' },
        { label: 'Tamanho', type: 'select', options: ['P', 'M', 'G'] },
        { label: 'Peso (kg)', type: 'number', required: false },
        { label: 'Artesanal', type: 'boolean' },
      ],
    });
    expect(put.status, JSON.stringify(put.body)).to.equal(200);
    expect(put.body.fields.map((f) => f.key)).to.deep.equal(['validade', 'tamanho', 'peso_kg', 'artesanal']);
    const asSeller = await get(seller.token, '/api/custom-fields');
    expect(asSeller.status).to.equal(200);
    expect(asSeller.body.product).to.have.length(4);
    expect(asSeller.body.customer).to.have.length(0);
  });

  it('CF-002 | so quem pode gerenciar a empresa altera as definicoes', async () => {
    const r = await send('put', seller.token, '/api/custom-fields/product', { fields: [] });
    expect(r.status).to.equal(403);
  });

  it('CF-003 | validacao das definicoes (rotulo, tipo, opcoes, duplicados, limite)', async () => {
    const bad = (fields) => send('put', owner.token, '/api/custom-fields/customer', { fields });
    expect((await bad([{ label: '', type: 'text' }])).status).to.equal(422);
    expect((await bad([{ label: '<b>x</b>', type: 'text' }])).status).to.equal(422);
    expect((await bad([{ label: 'A', type: 'foto' }])).status).to.equal(422);
    expect((await bad([{ label: 'A', type: 'select', options: ['so uma'] }])).status).to.equal(422);
    expect((await bad([{ label: 'Nome', type: 'text' }, { label: 'nome', type: 'text' }])).status).to.equal(422);
    const many = Array.from({ length: 16 }, (_, i) => ({ label: `Campo ${i}`, type: 'text' }));
    expect((await bad(many)).status).to.equal(422);
    expect((await send('put', owner.token, '/api/custom-fields/pedido', { fields: [] })).status).to.equal(404);
  });

  it('CF-004 | valores: salva, valida por tipo, mescla e aparece no GET do produto', async () => {
    const url = `/api/custom-fields/product/${product.id}/values`;
    const ok = await send('put', owner.token, url, { values: { validade: '2027-01-31', tamanho: 'M', peso_kg: '1,5', artesanal: true } });
    expect(ok.status, JSON.stringify(ok.body)).to.equal(200);
    expect(ok.body.extra).to.deep.equal({ validade: '2027-01-31', tamanho: 'M', peso_kg: 1.5, artesanal: true });
    expect((await send('put', owner.token, url, { values: { tamanho: 'XG' } })).status).to.equal(422);
    expect((await send('put', owner.token, url, { values: { validade: '31/01/2027' } })).status).to.equal(422);
    expect((await send('put', owner.token, url, { values: { peso_kg: 'abc' } })).status).to.equal(422);
    expect((await send('put', owner.token, url, { values: { inexistente: 'x' } })).status).to.equal(422);
    const merged = await send('put', owner.token, url, { values: { tamanho: 'G', validade: '' } });
    expect(merged.body.extra).to.deep.equal({ tamanho: 'G', peso_kg: 1.5, artesanal: true });
    const got = await get(owner.token, `/api/products/${product.id}`);
    expect(got.body.extra).to.deep.equal({ tamanho: 'G', peso_kg: 1.5, artesanal: true });
  });

  it('CF-005 | campo obrigatorio nao aceita valor vazio; clientes tambem suportam extras', async () => {
    await send('put', owner.token, '/api/custom-fields/customer', {
      fields: [{ label: 'Instagram', type: 'text', required: true }, { label: 'Pet', type: 'text' }],
    });
    const url = `/api/custom-fields/customer/${customer.id}/values`;
    expect((await send('put', owner.token, url, { values: { instagram: '' } })).status).to.equal(422);
    const ok = await send('put', owner.token, url, { values: { instagram: '@cli', pet: 'Rex' } });
    expect(ok.body.extra).to.deep.equal({ instagram: '@cli', pet: 'Rex' });
    const got = await get(owner.token, `/api/customers/${customer.id}`);
    expect(got.body.extra).to.deep.equal({ instagram: '@cli', pet: 'Rex' });
  });

  it('CF-006 | vendedor grava extras de produto? nao (products:write); de cliente sim', async () => {
    const p = await send('put', seller.token, `/api/custom-fields/product/${product.id}/values`, { values: { tamanho: 'P' } });
    expect(p.status).to.equal(403);
    const c = await send('put', seller.token, `/api/custom-fields/customer/${customer.id}/values`, { values: { pet: 'Thor' } });
    expect(c.status, JSON.stringify(c.body)).to.equal(200);
    expect(c.body.extra.pet).to.equal('Thor');
  });

  it('CF-007 | isolamento: outra empresa nao ve nem altera registros e definicoes', async () => {
    expect((await get(other.token, '/api/custom-fields')).body.product).to.have.length(0);
    await send('put', other.token, '/api/custom-fields/product', { fields: [{ label: 'Tamanho', type: 'select', options: ['P', 'M'] }] });
    const r = await send('put', other.token, `/api/custom-fields/product/${product.id}/values`, { values: { tamanho: 'P' } });
    expect(r.status).to.equal(404);
    const mine = await get(owner.token, '/api/custom-fields');
    expect(mine.body.product.find((f) => f.key === 'tamanho').options).to.deep.equal(['P', 'M', 'G']);
  });

  it('CF-008 | remover definicao some da lista e valores antigos deixam de ser aceitos', async () => {
    const put = await send('put', owner.token, '/api/custom-fields/product', { fields: [{ key: 'tamanho', label: 'Tamanho', type: 'select', options: ['P', 'M', 'G'] }] });
    expect(put.body.fields.map((f) => f.key)).to.deep.equal(['tamanho']);
    const r = await send('put', owner.token, `/api/custom-fields/product/${product.id}/values`, { values: { artesanal: true } });
    expect(r.status).to.equal(422);
  });
});
