describe('Auth - Logout', () => {
  beforeEach(() => {
    cy.setCookie('sgvc_csrf', 'csrf-test');
    cy.intercept('GET', '**/api/auth/csrf', { statusCode: 200, body: { csrfToken: 'csrf-test' } }).as('csrf');
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user: { id: 'u1', email: 'admin@negocio.com' } } }).as('me');
    cy.intercept('GET', '**/api/analytics/overview*', { statusCode: 200, fixture: 'dashboard-overview.json' }).as('overview');
    // Demais chamadas do painel (insights, alertas): sem isso a API real responde 401 e o painel volta ao login
    cy.intercept('GET', '**/api/reports/financial*', { statusCode: 200, body: { revenue: 0, cmv: 0, profit: 0, salesCount: 0 } });
    cy.intercept('GET', '**/api/customers*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/api/products*', { statusCode: 200, body: [] });
  });

  it('Logout → limpa sessão e redireciona para login', () => {
    cy.intercept('POST', '**/api/auth/logout', { statusCode: 204 }).as('logout');

    cy.visit('/dashboard.html');
    cy.wait('@me');
    cy.wait('@overview');

    cy.get('#logout-btn').click();
    cy.wait('@logout');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/');
  });
});

