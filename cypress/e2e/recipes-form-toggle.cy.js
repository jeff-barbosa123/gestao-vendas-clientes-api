// Fichas tecnicas: cadastro recolhivel (aberto sem fichas, recolhido com fichas).
describe('SGVC - Fichas tecnicas: formulario de cadastro recolhivel', () => {
  const open = (list) => {
    cy.intercept({ method: 'GET', url: '**/api/recipes' }, list ? { body: list } : { fixture: 'recipes-list.json' }).as('fetchRecipes');
    cy.visitWithSession('/recipes.html');
    cy.wait('@fetchRecipes');
  };

  it('RECTOG-001 | com fichas: recolhido; botao abre e fecha e leva o foco ao nome', () => {
    open();
    cy.get('#recipes-form-toggle').should('be.visible').and('have.attr', 'aria-expanded', 'false').and('contain', 'Nova ficha');
    cy.get('#create-form').should('not.be.visible');
    cy.get('#recipes-form-toggle').click().should('have.attr', 'aria-expanded', 'true').and('contain', 'Fechar cadastro');
    cy.get('#create-form').should('be.visible');
    cy.focused().should('have.attr', 'id', 'create-name');
    cy.get('#recipes-form-toggle').click().should('have.attr', 'aria-expanded', 'false');
    cy.get('#create-form').should('not.be.visible');
  });

  it('RECTOG-002 | sem fichas: ja nasce aberto e o estado vazio leva ao campo nome', () => {
    open([]);
    cy.get('#recipes-form-toggle').should('have.attr', 'aria-expanded', 'true');
    cy.get('#create-form').should('be.visible');
    cy.get('#recipes-body [data-empty-state="none"]').should('contain', 'Nenhuma ficha t\u00e9cnica cadastrada ainda');
    cy.get('#recipes-body [data-empty-focus]').click();
    cy.focused().should('have.attr', 'id', 'create-name');
  });

  it('RECTOG-003 | escolha manual nao e sobrescrita ao atualizar a lista', () => {
    open();
    cy.get('#recipes-form-toggle').click();
    cy.get('#refresh-list').click();
    cy.get('#create-form').should('be.visible');
    cy.get('#recipes-form-toggle').should('have.attr', 'aria-expanded', 'true');
  });
});
