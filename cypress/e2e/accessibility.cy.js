const openAccessibilityClients = () => {
  cy.stubDashboardMetrics();
  cy.stubCustomerList();
  cy.loginAsAdmin();
  cy.openClientsFromDashboard();
  cy.wait('@customersList');
};

describe('Acessibilidade basica', () => {
  beforeEach(() => {
    openAccessibilityClients();
  });

  it('Navegacao por teclado percorre os principais campos', () => {
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'id', 'create-type');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'id', 'create-name');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'id', 'create-email');
  });

  it('Foco visivel usa outline ou sombra', () => {
    cy.get('#create-name').focus();
    cy.get('#create-name').should(($el) => {
      const style = window.getComputedStyle($el[0]);
      expect(style.outlineStyle !== 'none' || style.boxShadow !== 'none').to.equal(true);
    });
  });

  it('Labels associados existem para os inputs', () => {
    cy.get('label[for="create-name"]').should('exist');
    cy.get('label[for="create-email"]').should('exist');
    cy.get('label[for="create-phone"]').should('exist');
  });

  it('Contraste minimo mantem o botao visivel', () => {
    cy.get('#create-submit').should(($btn) => {
      const style = window.getComputedStyle($btn[0]);
      expect(style.backgroundColor).not.equal('rgba(0, 0, 0, 0)');
      expect(style.color).not.equal('transparent');
    });
  });

  it('Leitura de tela basica passa no axe', () => {
    cy.injectAxe();
    cy.checkA11y('#main', {
      runOnly: ['wcag2a', 'wcag2aa'],
    });
  });
});
