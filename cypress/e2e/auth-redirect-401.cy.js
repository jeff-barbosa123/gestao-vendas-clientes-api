describe('Auth - 401 redireciona para login', () => {
  beforeEach(() => {
    cy.setCookie('sgvc_csrf', 'csrf-test');
    cy.intercept('GET', '**/api/auth/csrf', { statusCode: 200, body: { csrfToken: 'csrf-test' } }).as('csrf');
  });

  it('Requisição retorna 401 → redireciona para login', () => {
    cy.intercept('GET', '**/api/auth/me', { statusCode: 401, body: { error: 'UNAUTHORIZED' } }).as('me401');

    cy.visit('/dashboard.html');
    cy.wait('@me401');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/');
  });
});

