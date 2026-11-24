// Estados vazios padronizados: "nada cadastrado" (com acao) x "busca/filtro sem resultado".
describe('SGVC - Estados vazios', () => {
  let dono;
  before(() => {
    cy.createRealUser('vazios').then((u) => { dono = u; });
  });
  beforeEach(() => {
    cy.loginReal(dono);
  });

  const none = (bodySel, text, ctaText, focusId) => {
    cy.get(`${bodySel} [data-empty-state="none"]`).should('contain', text);
    cy.wait(600);
    cy.get(`${bodySel} [data-empty-focus]`).should('contain', ctaText).click();
    cy.focused().should('have.attr', 'id', focusId);
  };

  it('EMPTY-001 | Clientes: sem cadastro mostra chamada para cadastrar o primeiro', () => {
    cy.visit('/clients.html');
    none('#clients-body', 'Nenhum cliente cadastrado ainda', 'Cadastrar primeiro cliente', 'create-name');
  });

  it('EMPTY-002 | Produtos, Fichas, Vendas e Insumos: estado "nada cadastrado" com acao', () => {
    cy.visit('/products.html');
    none('#products-body', 'Nenhum produto cadastrado ainda', 'Cadastrar primeiro produto', 'create-name');
    cy.visit('/recipes.html');
    cy.get('[data-empty-state="none"]').should('contain', 'Nenhuma ficha técnica cadastrada ainda');
    cy.wait(600);
    cy.get('[data-empty-focus]').click();
    cy.focused().should('have.attr', 'id', 'create-name');
    cy.visit('/sales.html');
    cy.get('[data-empty-state="none"]').should('contain', 'Nenhuma venda registrada ainda');
    cy.visit('/ingredients.html');
    cy.get('[data-empty-state="none"]').should('contain', 'Nenhum insumo cadastrado ainda');
    cy.wait(600);
    cy.get('[data-empty-focus]').click();
    cy.focused().should('have.attr', 'id', 'ing-name');
  });

  it('EMPTY-003 | Financeiro: sem lancamentos mostra a acao; filtro sem resultado oferece limpar', () => {
    cy.visit('/finance.html');
    cy.get('#fin-body [data-empty-state="none"]').should('contain', 'Nenhum lançamento cadastrado ainda');
    cy.wait(600);
    cy.get('#fin-body [data-empty-focus]').click();
    cy.focused().should('have.attr', 'id', 'f-desc');
    cy.get('#flt-kind').select('PAYABLE');
    cy.get('#fin-body [data-empty-state="filtered"]').should('contain', 'Nenhum lançamento encontrado para este filtro');
    cy.get('#fin-body [data-empty-clear]').click();
    cy.get('#flt-kind').should('have.value', '');
  });

  it('EMPTY-004 | Clientes: busca sem resultado nao pede cadastro e permite limpar a busca', () => {
    const stamp = Date.now();
    cy.apiReal('POST', '/api/customers', { name: 'Vazio Teste', email: `vazio-${stamp}@teste.com` });
    cy.visit('/clients.html');
    cy.get('#clients-body').should('contain', 'Vazio Teste');
    cy.get('#search-input').type('zzzzzz');
    cy.get('#clients-body [data-empty-state="filtered"]').should('contain', 'Nenhum cliente encontrado para esta busca ou filtro');
    cy.get('#clients-body [data-empty-focus]').should('not.exist');
    cy.get('#clients-body [data-empty-clear]').click();
    cy.get('#search-input').should('have.value', '');
    cy.get('#clients-body').should('contain', 'Vazio Teste');
  });
});
