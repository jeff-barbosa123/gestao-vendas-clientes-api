// Grupos recolhiveis da sidebar (static/nav.js).
describe('SGVC - Sidebar: grupos recolhiveis', () => {
  const toggle = (title) => cy.contains('.app-nav-group-toggle', title);

  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.clearLocalStorage();
    cy.stubAuthenticated();
  });

  it('COLLAPSE-001 | todos abertos por padrao; Painel e Conta nao recolhem', () => {
    cy.visit('/dashboard.html');
    cy.get('.app-nav-group-toggle').should('have.length', 3).each(($b) => {
      expect($b.attr('aria-expanded')).to.eq('true');
    });
    cy.get('.app-nav-links a[href="/sales.html"]').should('be.visible');
    cy.get('#nav-logout').should('be.visible');
  });

  it('COLLAPSE-002 | clique recolhe/expande, lembra o estado e preserva o rodape Conta', () => {
    cy.visit('/dashboard.html');
    toggle('Opera').click();
    toggle('Opera').should('have.attr', 'aria-expanded', 'false');
    cy.get('.app-nav-links a[href="/sales.html"]').should('not.be.visible');
    cy.get('.app-nav-links a[href="/products.html"]').should('be.visible');
    cy.get('#nav-logout').should('be.visible');
    cy.reload();
    toggle('Opera').should('have.attr', 'aria-expanded', 'false');
    toggle('Opera').click();
    cy.get('.app-nav-links a[href="/sales.html"]').should('be.visible');
  });

  it('COLLAPSE-003 | o grupo da pagina ativa abre sozinho, com o item destacado', () => {
    cy.visit('/dashboard.html');
    toggle('Opera').click();
    cy.visit('/sales.html');
    toggle('Opera').should('have.attr', 'aria-expanded', 'true');
    cy.get('.app-nav-links a[href="/sales.html"]').should('be.visible').and('have.class', 'is-active').and('have.attr', 'aria-current', 'page');
  });

  it('COLLAPSE-004 | funciona pelo teclado (Enter/Espaco no titulo do grupo)', () => {
    cy.visit('/dashboard.html');
    toggle('Clientes').focus().type('{enter}');
    toggle('Clientes').should('have.attr', 'aria-expanded', 'false');
    cy.get('.app-nav-links a[href="/crm.html"]').should('not.be.visible');
    toggle('Clientes').focus().type(' ');
    toggle('Clientes').should('have.attr', 'aria-expanded', 'true');
    cy.get('.app-nav-links a[href="/crm.html"]').should('be.visible');
  });
});
