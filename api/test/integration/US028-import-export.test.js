const { expect } = require('chai');
const ExcelJS = require('exceljs');
const { getClient } = require('../utils/httpClient');
const sheet = require('../../src/utils/spreadsheet');

const AUTH = '/api/auth';
const uniq = () => `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

describe('US028 - Utilitario de planilhas (CSV/XLSX)', () => {
  const columns = [
    { key: 'name', label: 'Nome', required: true },
    { key: 'price', label: 'Preço', type: 'money', required: true },
    { key: 'qty', label: 'Qtd', type: 'int' },
    { key: 'day', label: 'Data', type: 'date' },
  ];

  it('SHEET-001 | CSV sai em UTF-8 com BOM, separador ";" e escapa aspas/quebras', () => {
    const buf = sheet.buildCsv(columns, [{ name: 'Bolo "de" cenoura; grande', price: 12.5, qty: 3, day: '2026-03-15T12:00:00Z' }]);
    expect(buf.subarray(0, 3).equals(BOM)).to.equal(true);
    const text = buf.toString('utf8').replace(/^﻿/, '');
    const [head, line] = text.split('\r\n');
    expect(head).to.equal('Nome;Preço;Qtd;Data');
    expect(line).to.equal('"Bolo ""de"" cenoura; grande";12,50;3;15/03/2026');
  });

  it('SHEET-002 | texto que o Excel leria como formula recebe apostrofo (CSV e XLSX) e volta ao importar', async () => {
    const csv = sheet.buildCsv(columns, [{ name: '=HYPERLINK("x")', price: 1 }]).toString('utf8');
    expect(csv).to.contain("'=HYPERLINK");
    const xlsx = await sheet.buildXlsx(columns, [{ name: '=1+1', price: 1 }]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsx);
    expect(wb.worksheets[0].getCell('A2').value).to.equal("'=1+1");
    expect(sheet.toText("'=1+1")).to.equal('=1+1');
  });

  it('SHEET-003 | XLSX tem cabecalho, numeros e datas reais e e lido de volta (ida e volta)', async () => {
    const buf = await sheet.buildXlsx(columns, [{ name: 'Brigadeiro', price: 36.9, qty: 2, day: '2026-03-15T12:00:00Z' }]);
    expect(buf[0]).to.equal(0x50); // zip "PK"
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    expect(ws.getCell('B2').value).to.equal(36.9);
    expect(ws.getCell('D2').value).to.be.instanceOf(Date);
    const rows = await sheet.readTable(buf, columns);
    expect(rows).to.have.length(1);
    expect(rows[0].values.name).to.equal('Brigadeiro');
    expect(rows[0].rowNumber).to.equal(2);
  });

  it('SHEET-004 | leitura de CSV: BOM, ";" "," e TAB, aspas, linhas em branco e cabecalho sem acento/caixa', async () => {
    const semi = Buffer.from('﻿nome;preco;qtd\r\n"Bolo; ""x""";10,50;2\r\n\r\nPão;3;\r\n', 'utf8');
    const rows = await sheet.readTable(semi, columns);
    expect(rows.map((r) => r.values.name)).to.deep.equal(['Bolo; "x"', 'Pão']);
    expect(rows[1].rowNumber).to.equal(4);
    const comma = Buffer.from('Nome,Preco\nA,1\n', 'utf8');
    expect((await sheet.readTable(comma, columns))[0].values.price).to.equal('1');
    const tab = Buffer.from('Nome\tPreço\nA\t2\n', 'utf8');
    expect((await sheet.readTable(tab, columns))[0].values.price).to.equal('2');
  });

  it('SHEET-005 | CSV em ANSI (Excel antigo) e lido sem corromper acentos', async () => {
    const ansi = Buffer.from('Nome;Preço\nCafé;5\n', 'latin1');
    const rows = await sheet.readTable(ansi, columns);
    expect(rows[0].values.name).to.equal('Café');
  });

  it('SHEET-006 | conversao de numeros e datas (pt-BR, ISO e Excel)', () => {
    expect(sheet.toNumber('R$ 1.234,56')).to.equal(1234.56);
    expect(sheet.toNumber('10.5')).to.equal(10.5);
    expect(sheet.toNumber('10,5')).to.equal(10.5);
    expect(sheet.toNumber('1.234.567')).to.equal(1234567);
    expect(sheet.toNumber('')).to.equal(null);
    expect(() => sheet.toNumber('abc', 'Preço')).to.throw('Preço inválido');
    expect(sheet.toIsoDate('15/03/1990')).to.equal('1990-03-15');
    expect(sheet.toIsoDate('1990-03-15')).to.equal('1990-03-15');
    expect(sheet.toIsoDate(new Date(Date.UTC(1990, 2, 15)))).to.equal('1990-03-15');
    expect(() => sheet.toIsoDate('31/02/2020')).to.throw('Data inválida');
  });

  it('SHEET-007 | colunas obrigatorias ausentes e arquivo vazio rejeitam o arquivo todo (422)', async () => {
    let err;
    try { await sheet.readTable(Buffer.from('Nome\nA\n'), columns); } catch (e) { err = e; }
    expect(err.status).to.equal(422);
    expect(err.code).to.equal('MISSING_COLUMNS');
    expect(err.message).to.contain('Preço');
    err = null;
    try { await sheet.importRows({ buffer: Buffer.from('Nome;Preço\n'), columns, handler: async () => {} }); } catch (e) { err = e; }
    expect(err.code).to.equal('EMPTY_FILE');
  });

  it('SHEET-008 | importacao linha a linha: erro numa linha nao derruba o lote e o resumo aponta a linha', async () => {
    const csv = Buffer.from('Nome;Preço;Qtd\nA;1;1\n;2;1\nC;abc;1\nD;4;1,5\nE;5;2\n', 'utf8');
    const created = [];
    const res = await sheet.importRows({
      buffer: csv,
      columns,
      handler: async (v) => {
        if (v.name === 'E') throw new Error('Já existe');
        created.push(v.name);
      },
    });
    expect(res).to.include({ total: 5, imported: 1, failed: 4 });
    expect(created).to.deep.equal(['A']);
    expect(res.errors.map((e) => e.row)).to.deep.equal([3, 4, 5, 6]);
    expect(res.errors[0].message).to.contain('Nome é obrigatório');
    expect(res.errors[1].message).to.contain('Preço inválido');
    expect(res.errors[2].message).to.contain('inteiro');
    expect(res.errors[3].message).to.equal('Já existe');
  });

  it('SHEET-009 | limite de linhas e upload invalido', async () => {
    let err;
    try { await sheet.importRows({ buffer: Buffer.from('Nome;Preço\nA;1\nB;2\n'), columns, handler: async () => {}, maxRows: 1 }); } catch (e) { err = e; }
    expect(err.code).to.equal('TOO_MANY_ROWS');
    expect(() => sheet.decodeUpload({})).to.throw('Selecione um arquivo');
    expect(() => sheet.decodeUpload({ filename: 'x.pdf', contentBase64: 'QQ==' })).to.throw('Formato não suportado');
    expect(sheet.decodeUpload({ filename: 'x.csv', contentBase64: 'data:text/csv;base64,QQ==' }).toString()).to.equal('A');
  });

  it('SHEET-010 | formato: csv/xlsx/excel aceitos, outros rejeitados', () => {
    expect(sheet.normalizeFormat('CSV')).to.equal('csv');
    expect(sheet.normalizeFormat('excel')).to.equal('xlsx');
    expect(sheet.normalizeFormat('xlsx')).to.equal('xlsx');
    expect(sheet.normalizeFormat()).to.equal('csv');
    expect(() => sheet.normalizeFormat('ods')).to.throw('Formato inválido');
  });
});

describe('US028 - Importacao e exportacao nos cadastros (API)', () => {
  let http;
  let ipSeq = 0;
  const ip = () => `10.28.0.${(ipSeq++ % 250) + 1}`;
  const password = 'Planilha@12345';
  const bearer = (t) => ({ Authorization: `Bearer ${t}` });
  const binary = (res, cb) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  };
  const get = (t, p) => http.get(p).set(bearer(t)).set('x-forwarded-for', ip()).buffer(true).parse(binary);
  const send = (m, t, p, b) => http[m](p).set(bearer(t)).set('x-forwarded-for', ip()).send(b);
  const upload = (t, entity, filename, buffer) => send('post', t, `/api/import/${entity}`, { filename, contentBase64: buffer.toString('base64') });
  const text = (res) => res.body.toString('utf8');

  let owner;
  let other;
  let seller;
  let stockist;
  let anaId;
  const emailA = `ana-${uniq()}@teste.com`;

  const register = async (name) => {
    const email = `${name.toLowerCase().replace(/\s+/g, '')}+${uniq()}@teste.com`;
    const reg = await http.post(`${AUTH}/register`).set('x-forwarded-for', ip()).send({ email, password, name });
    expect(reg.status).to.be.oneOf([200, 201]);
    const login = await http.post(`${AUTH}/login`).set('x-forwarded-for', ip()).send({ email, password });
    return { token: login.body.token, email };
  };
  const join = async (role) => {
    const email = `${role}+${uniq()}@teste.com`;
    const inv = await send('post', owner.token, '/api/team/invitations', { email, role });
    expect(inv.status, JSON.stringify(inv.body)).to.equal(201);
    const token = new URL(inv.body.inviteUrl).searchParams.get('token');
    const acc = await http.post(`${AUTH}/invitations/${token}/accept`).set('x-forwarded-for', ip()).send({ name: role, password });
    expect(acc.status, JSON.stringify(acc.body)).to.equal(201);
    return { token: acc.body.token };
  };

  before(async () => {
    http = getClient();
    owner = await register('Empresa Planilhas');
    other = await register('Outra Empresa');
    seller = await join('seller');
    stockist = await join('stockist');
    const c = await send('post', owner.token, '/api/customers', { name: 'Ana Souza', email: emailA, phone: '81999990000', notes: 'Cliente VIP' });
    expect(c.status, JSON.stringify(c.body)).to.equal(201);
    anaId = c.body.id;
    const c2 = await send('post', other.token, '/api/customers', { name: 'Cliente Da Outra Empresa', email: `o-${uniq()}@teste.com`, phone: '81999990001' });
    expect(c2.status).to.equal(201);
  });

  it('IMPEXP-001 | exportacao de Clientes: CSV (BOM) e Excel (aceita "excel" e "xlsx") funcionam', async () => {
    const csv = await get(owner.token, '/api/export/customers?format=csv');
    expect(csv.status).to.equal(200);
    expect(csv.headers['content-type']).to.contain('text/csv');
    expect(csv.headers['content-disposition']).to.match(/attachment; filename="clientes_\d{8}_\d{4}\.csv"/);
    expect(csv.body.subarray(0, 3).equals(BOM)).to.equal(true);
    expect(text(csv)).to.contain('Ana Souza');
    expect(text(csv)).to.contain('Cliente VIP');
    expect(text(csv)).to.not.contain('sgvc-meta');
    for (const fmt of ['excel', 'xlsx']) {
      const x = await get(owner.token, `/api/export/customers?format=${fmt}`);
      expect(x.status, fmt).to.equal(200);
      expect(x.headers['content-type']).to.contain('spreadsheetml.sheet');
      expect(x.headers['content-disposition']).to.contain('.xlsx');
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(x.body);
      expect(wb.worksheets[0].getCell('A2').value).to.equal('Ana Souza');
    }
  });

  it('IMPEXP-002 | exportacao nao mistura empresas (multiempresa)', async () => {
    const mine = await get(owner.token, '/api/export/customers?format=csv');
    expect(text(mine)).to.not.contain('Outra Empresa');
    const theirs = await get(other.token, '/api/export/customers?format=csv');
    expect(text(theirs)).to.contain('Cliente Da Outra Empresa');
    expect(text(theirs)).to.not.contain('Ana Souza');
  });

  it('IMPEXP-003 | exportar sem dados gera arquivo so com cabecalho (nao e erro)', async () => {
    const fresh = await register('Empresa Vazia');
    const res = await get(fresh.token, '/api/export/products?format=csv');
    expect(res.status).to.equal(200);
    expect(text(res).trim().split(/\r?\n/)).to.have.length(1);
    const x = await get(fresh.token, '/api/export/customers?format=xlsx');
    expect(x.status).to.equal(200);
  });

  it('IMPEXP-004 | formato invalido e cadastro inexistente', async () => {
    expect((await get(owner.token, '/api/export/customers?format=ods')).status).to.equal(400);
    expect((await get(owner.token, '/api/export/naoexiste?format=csv')).status).to.equal(404);
  });

  it('IMPEXP-005 | modelo de Clientes/Produtos/Insumos em CSV e XLSX', async () => {
    for (const entity of ['customers', 'products', 'ingredients']) {
      const csv = await get(owner.token, `/api/import/${entity}/template?format=csv`);
      expect(csv.status, entity).to.equal(200);
      expect(csv.headers['content-disposition']).to.contain(`modelo_`);
      expect(csv.body.subarray(0, 3).equals(BOM)).to.equal(true);
      expect(text(csv).trim().split(/\r?\n/)).to.have.length(2); // cabecalho + exemplo
      const x = await get(owner.token, `/api/import/${entity}/template?format=xlsx`);
      expect(x.status, entity).to.equal(200);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(x.body);
      expect(wb.worksheets.map((w) => w.name)).to.include('Instruções');
    }
    expect((await get(owner.token, '/api/import/sales/template?format=csv')).status).to.equal(404);
  });

  it('IMPEXP-006 | importa Clientes em CSV: linhas boas entram, ruins sao listadas, duplicado nao derruba o lote', async () => {
    const csv = [
      'Nome;E-mail;Telefone;Tipo;CPF;Data de nascimento;Cidade;Observações',
      `Bruno Lima;bruno-${emailA};81988880000;PF;;15/03/1990;Recife;Gosta de bolo`,
      `Sem Email;;81977770000;PF;;;;`,
      `Duplicada;${emailA};81966660000;PF;;;;`,
      `E-mail ruim;nao-e-email;81955550000;PF;;;;`,
      `Carla Dias;carla-${emailA};81944440000;;;;Olinda;`,
    ].join('\n');
    const res = await upload(owner.token, 'customers', 'clientes.csv', Buffer.from(`﻿${csv}`, 'utf8'));
    expect(res.status, JSON.stringify(res.body)).to.equal(200);
    expect(res.body).to.include({ success: true, total: 5, imported: 2, failed: 3 });
    expect(res.body.errors.map((e) => e.row)).to.deep.equal([3, 4, 5]);
    res.body.errors.forEach((e) => expect(e.message).to.be.a('string').and.not.equal(''));
    const list = text(await get(owner.token, '/api/export/customers?format=csv'));
    expect(list).to.contain('Bruno Lima');
    expect(list).to.contain('Carla Dias');
    expect(list).to.contain('15/03/1990');
    expect(list).to.not.contain('Sem Email');
  });

  it('IMPEXP-007 | importa Clientes em XLSX (ida e volta com o arquivo exportado)', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Clientes');
    ws.addRow(['Nome', 'E-mail', 'Telefone', 'Data de nascimento']);
    ws.addRow(['Diana Reis', `diana-${emailA}`, '81933330000', new Date(Date.UTC(1985, 6, 20))]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const res = await upload(owner.token, 'customers', 'clientes.xlsx', buf);
    expect(res.body, JSON.stringify(res.body)).to.include({ total: 1, imported: 1, failed: 0 });
    const exported = await get(owner.token, '/api/export/customers?format=xlsx');
    const again = await upload(other.token, 'customers', 'clientes.xlsx', exported.body);
    expect(again.status).to.equal(200);
    expect(again.body.total).to.be.greaterThan(1);
    expect(again.body.imported + again.body.failed).to.equal(again.body.total);
  });

  it('IMPEXP-008 | Produtos: importa, exporta e informa erros por linha', async () => {
    const csv = [
      'Nome;Preço de venda;Custo de compra;Estoque;Estoque mínimo;Situação',
      'Brigadeiro;36,90;18;10;2;Ativo',
      'Sem preco;;5;1;;Ativo',
      'Tipo errado;10;5;1;;Talvez',
      'Torta;55.5;25,25;;;Inativo',
    ].join('\r\n');
    const res = await upload(owner.token, 'products', 'produtos.csv', Buffer.from(csv, 'utf8'));
    expect(res.body, JSON.stringify(res.body)).to.include({ total: 4, imported: 2, failed: 2 });
    expect(res.body.errors.map((e) => e.row)).to.deep.equal([3, 4]);
    const x = await get(owner.token, '/api/export/products?format=xlsx');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(x.body);
    const ws = wb.worksheets[0];
    const header = ws.getRow(1).values.slice(1);
    expect(header).to.include.members(['Nome', 'Preço de venda', 'Custo de compra', 'Estoque']);
    const names = [];
    ws.eachRow((r, n) => { if (n > 1) names.push(r.getCell(1).value); });
    expect(names).to.have.members(['Brigadeiro', 'Torta']);
    const priceCol = header.indexOf('Preço de venda') + 1;
    const row = ws.getRow(2).getCell(priceCol).value;
    expect(row).to.be.a('number');
  });

  it('IMPEXP-009 | Insumos: importa com unidades, rejeita invalidos e nome repetido', async () => {
    const csv = [
      'Nome;Quantidade da embalagem;Unidade;Preço da embalagem',
      'Leite condensado;395;g;6,50',
      'Farinha;1;kg;5',
      'Farinha;1;kg;5',
      'Açúcar;0;kg;4',
      'Óleo;900;xx;8',
    ].join('\n');
    const res = await upload(owner.token, 'ingredients', 'insumos.csv', Buffer.from(csv, 'utf8'));
    expect(res.body, JSON.stringify(res.body)).to.include({ total: 5, imported: 2, failed: 3 });
    expect(res.body.errors.map((e) => e.row)).to.deep.equal([4, 5, 6]);
    const list = text(await get(owner.token, '/api/export/ingredients?format=csv'));
    expect(list).to.contain('Leite condensado');
    expect(list).to.contain('Farinha');
  });

  it('IMPEXP-010 | arquivo invalido: sem arquivo, formato errado, colunas ausentes, vazio', async () => {
    expect((await send('post', owner.token, '/api/import/customers', {})).status).to.equal(400);
    expect((await upload(owner.token, 'customers', 'x.pdf', Buffer.from('a'))).status).to.equal(415);
    const missing = await upload(owner.token, 'customers', 'x.csv', Buffer.from('Telefone\n81999990000\n'));
    expect(missing.status).to.equal(422);
    expect(missing.body.code).to.equal('MISSING_COLUMNS');
    const empty = await upload(owner.token, 'customers', 'x.csv', Buffer.from('Nome;E-mail\n'));
    expect(empty.status).to.equal(422);
  });

  it('IMPEXP-011 | Vendas, Encomendas e Financeiro exportam CSV e XLSX', async () => {
    const prod = await send('post', owner.token, '/api/products', { name: `Item ${uniq()}`, price: 10, purchase_price: 4, stock: 9 });
    const sale = await send('post', owner.token, '/api/sales', { customerId: anaId, items: [{ productId: prod.body.id, quantity: 2, unitPrice: 10 }], paymentMethod: 'PIX' });
    expect(sale.status, JSON.stringify(sale.body)).to.equal(201);
    const fin = await send('post', owner.token, '/api/finance/entries', { kind: 'RECEIVABLE', description: 'Fiado da Ana', amount: 20, dueDate: '2026-12-10' });
    expect(fin.status, JSON.stringify(fin.body)).to.equal(201);
    const order = await send('post', owner.token, '/api/orders', {
      customerId: anaId, deliveryAt: new Date(Date.now() + 864e5).toISOString(), deposit: 5,
      items: [{ productId: prod.body.id, quantity: 2 }],
    });
    expect(order.status, JSON.stringify(order.body)).to.be.oneOf([200, 201]);
    for (const [entity, needle] of [['sales', 'PIX'], ['orders', 'Ana Souza'], ['finance', 'Fiado da Ana']]) {
      const csv = await get(owner.token, `/api/export/${entity}?format=csv`);
      expect(csv.status, entity).to.equal(200);
      expect(text(csv), entity).to.contain(needle);
      const x = await get(owner.token, `/api/export/${entity}?format=xlsx`);
      expect(x.status, entity).to.equal(200);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(x.body);
      expect(wb.worksheets[0].rowCount, entity).to.be.at.least(2);
    }
    const sales = text(await get(owner.token, '/api/export/sales?format=csv'));
    expect(sales).to.contain('20,00'); // total 2 x 10 em formato pt-BR
  });

  it('IMPEXP-012 | permissoes: vendedor nao exporta nem importa Produtos; estoquista nao importa Clientes', async () => {
    expect((await get(seller.token, '/api/export/customers?format=csv')).status).to.equal(403);
    expect((await upload(seller.token, 'products', 'p.csv', Buffer.from('Nome;Preço de venda;Custo de compra\nA;1;1\n'))).status).to.equal(403);
    expect((await get(seller.token, '/api/import/products/template?format=csv')).status).to.equal(403);
    expect((await upload(stockist.token, 'customers', 'c.csv', Buffer.from(`Nome;E-mail\nA;a-${uniq()}@t.com\n`))).status).to.equal(403);
    // vendedor importa Clientes (customers:write) e estoquista importa Produtos e Insumos
    const ok = await upload(seller.token, 'customers', 'c.csv', Buffer.from(`Nome;E-mail\nVendedora Importou;vi-${uniq()}@teste.com\n`));
    expect(ok.body).to.include({ imported: 1, failed: 0 });
    const prod = await upload(stockist.token, 'products', 'p.csv', Buffer.from('Nome;Preço de venda;Custo de compra\nEstoquista Item;5;2\n'));
    expect(prod.body).to.include({ imported: 1, failed: 0 });
  });

  it('IMPEXP-013 | modulo desativado bloqueia Insumos, Encomendas e Financeiro; sem login e 401', async () => {
    const off = await send('put', owner.token, '/api/company/modules', { producao: false, encomendas: false, financeiro: false });
    expect(off.status, JSON.stringify(off.body)).to.equal(200);
    try {
      expect((await get(owner.token, '/api/export/ingredients?format=csv')).status).to.equal(403);
      expect((await upload(owner.token, 'ingredients', 'i.csv', Buffer.from('Nome\nA\n'))).status).to.equal(403);
      expect((await get(owner.token, '/api/export/orders?format=csv')).status).to.equal(403);
      expect((await get(owner.token, '/api/export/finance?format=xlsx')).status).to.equal(403);
      expect((await get(owner.token, '/api/export/customers?format=csv')).status).to.equal(200);
    } finally {
      await send('put', owner.token, '/api/company/modules', { producao: true, encomendas: true, financeiro: true });
    }
    expect((await http.get('/api/export/customers?format=csv').set('x-forwarded-for', ip())).status).to.equal(401);
    expect((await http.post('/api/import/customers').set('x-forwarded-for', ip()).send({})).status).to.equal(401);
  });

  it('IMPEXP-014 | custo de compra some do arquivo para quem nao tem permissao de custos', async () => {
    const mgr = await join('manager');
    const full = text(await get(mgr.token, '/api/export/products?format=csv'));
    expect(full).to.contain('Custo de compra');
    // estoquista tem cost:view; o vendedor nao exporta (sem export:use) - valida a regra de colunas direto
    const permissions = require('../../src/services/permissions');
    expect(permissions.can('seller', 'cost:view')).to.equal(false);
    const { ENTITIES } = require('../../src/services/spreadsheetEntities');
    const visible = ENTITIES.products.columns.filter((c) => !c.perm || permissions.can('seller', c.perm)).map((c) => c.label);
    expect(visible).to.not.include('Custo de compra');
  });
});
