describe('Auth - Login invalido', () => {
  beforeEach(() => {
    cy.setCookie('sgvc_csrf', 'csrf-test');
    cy.intercept('GET', '**/api/auth/csrf', { statusCode: 200, body: { csrfToken: 'csrf-test' } }).as('csrf');
    cy.visit('/index.html');
  });

  it('Login invalido → exibe mensagem de erro', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 401,
      body: { error: 'Credenciais invalidas' },
    }).as('loginFail');

    cy.get('#email').clear().type('admin@negocio.com');
    cy.get('#password').clear().type('Senha@Errada123!');
    cy.get('#login-btn').click();

    cy.wait('@csrf');
    cy.wait('@loginFail');
    cy.get('#login-error').should('be.visible');
    cy.get('#login-error-text').should('contain', 'E-mail ou senha incorretos');
  });
});

