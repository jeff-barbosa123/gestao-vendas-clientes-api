describe('Auth - Login valido', () => {
  beforeEach(() => {
    cy.setCookie('sgvc_csrf', 'csrf-test');
    cy.intercept('GET', '**/api/auth/csrf', { statusCode: 200, body: { csrfToken: 'csrf-test' } }).as('csrf');
  });

  it('Login com credenciais validas → redireciona para dashboard', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: { user: { id: 'u1', email: 'admin@negocio.com' } },
    }).as('login');

    cy.visit('/index.html');
    cy.get('#email').clear().type('admin@negocio.com');
    cy.get('#password').clear().type('Admin@123!');
    cy.get('#login-btn').click();

    cy.wait('@csrf');
    cy.wait('@login');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard.html');
  });
});

