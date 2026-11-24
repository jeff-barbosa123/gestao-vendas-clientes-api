// Planilhas CSV/XLSX: exportar, baixar modelo e importar (static/sheet-tools.js).
describe('SGVC - Importacao e exportacao de planilhas', () => {
  let dono;
  before(() => {
    cy.createRealUser('planilhas').then((u) => { dono = u; });
  });
  beforeEach(() => {
    cy.loginReal(dono);
  });

  const ok = (alias) => cy.wait(alias).its('response.statusCode').should('eq', 200);

  it('SHEETUI-001 | Clientes: exporta CSV e XLSX e baixa o modelo', () => {
    cy.visit('/clients.html');
    cy.intercept('GET', '**/api/export/customers*').as('exp');
    cy.intercept('GET', '**/api/import/customers/template*').as('tpl');
    cy.get('#clients-export-format').select('csv');
    cy.get('#clients-export-btn').click();
    ok('@exp');
    cy.get('#clients-export-format').select('xlsx');
    cy.get('#clients-export-btn').click();
    cy.wait('@exp').then(({ response }) => {
      expect(response.statusCode).to.eq(200);
      expect(response.headers['content-type']).to.contain('spreadsheetml');
    });
    cy.get('#clients-template-btn').click();
    ok('@tpl');
  });

  it('SHEETUI-002 | Clientes: importa CSV com linha invalida e mostra resumo por linha', () => {
    cy.visit('/clients.html');
    const stamp = Date.now();
    const csv = [
      'Nome;E-mail;Telefone',
      `Ana UI;ana-ui-${stamp}@teste.com;81999990000`,
      `Sem Email;;81999990001`,
    ].join('\n');
    cy.get('#clients-import-input').selectFile(
      { contents: Cypress.Buffer.from(csv, 'utf8'), fileName: 'clientes.csv', mimeType: 'text/csv' },
      { force: true },
    );
    cy.get('#clients-import-summary').should('be.visible')
      .and('contain', '1 importado(s)')
      .and('contain', '1 com erro')
      .and('contain', 'Linha 3');
  });

  it('SHEETUI-003 | Produtos e Insumos: oferecem importar, modelo e exportar', () => {
    cy.visit('/products.html');
    cy.get('#products-export-btn').should('be.visible');
    cy.get('#products-template-btn').should('be.visible');
    cy.get('#products-import-btn').should('be.visible');
    cy.visit('/ingredients.html');
    cy.get('#ingredients-export-btn').should('be.visible');
    cy.get('#ingredients-template-btn').should('be.visible');
    cy.get('#ingredients-import-btn').should('be.visible');
  });

  it('SHEETUI-004 | Vendas, Encomendas e Financeiro: apenas exportar', () => {
    [['sales', '/sales.html'], ['orders', '/orders.html'], ['finance', '/finance.html']].forEach(([id, page]) => {
      cy.visit(page);
      cy.intercept('GET', `**/api/export/${id}*`).as('exp');
      cy.get(`#${id}-export-btn`).should('be.visible');
      cy.get(`#${id}-import-btn`).should('not.exist');
      cy.get(`#${id}-export-format`).select('xlsx');
      cy.get(`#${id}-export-btn`).click();
      ok('@exp');
    });
  });
});
