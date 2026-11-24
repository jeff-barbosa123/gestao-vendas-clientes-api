// Produtos: cadastro recolhivel (aberto sem produtos, recolhido com produtos).
describe('SGVC - Produtos: formulario de cadastro recolhivel', () => {
  const stub = (products) => {
    cy.intercept('GET', '**/api/products', products ? { body: products } : { fixture: 'products-list.json' }).as('productsList');
    cy.intercept('GET', '**/api/recipes*', { body: [] }).as('recipesList');
    cy.seedSession();
    cy.visit('/products.html');
    cy.wait('@productsList');
  };

  it('PRODTOG-001 | com produtos: recolhido; botao abre e fecha, mantendo ids e foco', () => {
    stub();
    cy.get('#products-form-toggle').should('be.visible').and('have.attr', 'aria-expanded', 'false').and('contain', 'Novo produto');
    cy.get('#create-form').should('not.be.visible');
    cy.get('#products-form-toggle').click().should('have.attr', 'aria-expanded', 'true').and('contain', 'Fechar cadastro');
    cy.get('#create-form').should('be.visible');
    cy.focused().should('have.attr', 'id', 'create-name');
    cy.get('#products-form-toggle').click().should('have.attr', 'aria-expanded', 'false');
    cy.get('#create-form').should('not.be.visible');
  });

  it('PRODTOG-002 | sem produtos: o formulario ja nasce aberto e o estado vazio leva ao campo nome', () => {
    stub([]);
    cy.get('#products-form-toggle').should('have.attr', 'aria-expanded', 'true');
    cy.get('#create-form').should('be.visible');
    cy.get('#products-body [data-empty-state="none"]').should('contain', 'Nenhum produto cadastrado ainda');
  });

  it('PRODTOG-003 | escolha do usuario nao e sobrescrita quando a lista recarrega', () => {
    stub();
    cy.get('#products-form-toggle').click();
    cy.get('#refresh-list').click();
    cy.get('#create-form').should('be.visible');
    cy.get('#products-form-toggle').should('have.attr', 'aria-expanded', 'true');
  });
});
