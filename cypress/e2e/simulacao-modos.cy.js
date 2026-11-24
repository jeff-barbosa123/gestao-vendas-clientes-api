// Simulacao: dois modos (ficha tecnica x rapida) em abas, sem perder os seletores existentes.
describe('SGVC - Simulacao em modos', () => {
  const visitSim = (recipes) => {
    cy.stubAuthenticated();
    cy.intercept('GET', '**/api/recipes*', { statusCode: 200, body: recipes }).as('recipes');
    cy.visit('/simulacao.html');
    cy.wait('@recipes');
  };

  it('SIM-001 | com fichas: abre em "Usar ficha tecnica" e a rapida fica oculta', () => {
    visitSim([{ id: 1, name: 'Brigadeiro', yield: 10 }]);
    cy.get('#tab-recipe').should('have.attr', 'aria-selected', 'true');
    cy.get('#mode-recipe').should('be.visible');
    cy.get('#mode-quick').should('not.be.visible');
    cy.get('#by-id-form').should('be.visible');
  });

  it('SIM-002 | alterna para Simulacao rapida por clique e teclado, mantendo os ids', () => {
    visitSim([{ id: 1, name: 'Brigadeiro', yield: 10 }]);
    cy.get('#tab-quick').click();
    cy.get('#tab-quick').should('have.attr', 'aria-selected', 'true');
    cy.get('#mode-quick').should('be.visible').and('contain', 'não serão salvos');
    cy.get('#quick-yield').should('be.visible');
    cy.get('#mode-recipe').should('not.be.visible');
    cy.get('#tab-quick').type('{leftarrow}');
    cy.get('#tab-recipe').should('have.attr', 'aria-selected', 'true');
    cy.get('#recipe-id').should('be.visible');
  });

  it('SIM-003 | sem fichas: abre direto na Simulacao rapida', () => {
    visitSim([]);
    cy.get('#tab-quick').should('have.attr', 'aria-selected', 'true');
    cy.get('#mode-quick').should('be.visible');
    cy.get('#quick-submit').should('be.visible');
  });
});
