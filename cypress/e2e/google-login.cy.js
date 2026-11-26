describe('Login com Google - tela de login', () => {
  const mockProviders = (google) =>
    cy.intercept('GET', '/api/auth/providers', { statusCode: 200, body: { google } }).as('providers');

  it('GL-001 | Esconde o botao quando o Google nao esta configurado', () => {
    mockProviders(false);
    cy.visit('/');
    cy.wait('@providers');
    cy.get('#social-login').should('not.be.visible');
    cy.get('#google-login-btn').should('not.be.visible');
  });

  it('GL-002 | Mostra o botao "Continuar com o Google" apontando para o fluxo OAuth', () => {
    mockProviders(true);
    cy.visit('/');
    cy.wait('@providers');
    cy.get('#google-login-btn')
      .should('be.visible')
      .and('contain.text', 'Continuar com o Google')
      .and('have.attr', 'href', '/api/auth/google');
    cy.get('#google-login-btn svg').should('have.attr', 'aria-hidden', 'true');
  });

  it('GL-003 | Botao usa tokens do tema (fundo escuro e texto claro) com contraste adequado', () => {
    mockProviders(true);
    cy.visit('/');
    cy.wait('@providers');
    cy.document().then((doc) => {
      const bg = getComputedStyle(doc.documentElement).getPropertyValue('--bg').trim();
      const probe = doc.createElement('div');
      probe.style.color = bg;
      doc.body.appendChild(probe);
      const expected = getComputedStyle(probe).color;
      probe.remove();
      cy.get('#google-login-btn').should('have.css', 'background-color', expected);
    });
    cy.get('#google-login-btn').focus().should('have.css', 'outline-style', 'solid');
  });

  it('GL-004 | Exibe mensagem amigavel para ?google_error e limpa a URL', () => {
    mockProviders(true);
    cy.visit('/?google_error=cancelled');
    cy.get('#login-error').should('be.visible');
    cy.get('#login-error-text').should('have.text', 'Login com Google cancelado.');
    cy.location('search').should('not.contain', 'google_error');
  });

  it('GL-005 | Codigo de erro desconhecido usa a mensagem generica', () => {
    mockProviders(true);
    cy.visit('/?google_error=algo_inesperado');
    cy.get('#login-error-text').should('contain.text', 'Não foi possível entrar com o Google');
  });

  it('GL-006 | Login por senha continua funcionando com o botao visivel', () => {
    mockProviders(true);
    // Login simulado: nao depende de usuario do seed (no CI o seed usa ADMIN_EMAIL/ADMIN_PASSWORD do workflow)
    cy.interceptLogin({ alias: 'loginSenha' });
    cy.visit('/');
    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('Admin@123!', { log: false });
    cy.get('#login-btn').click();
    cy.wait('@loginSenha');
    cy.location('pathname').should('eq', '/dashboard.html');
  });
});
