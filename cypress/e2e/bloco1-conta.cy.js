// Bloco 1: perfil (usuario, senha de conta Google, sessoes, empresa), monitoramento restrito e onboarding.
describe('SGVC - Bloco 1: conta e primeiros passos', () => {
  const baseUser = {
    id: 'u1',
    email: 'conta@negocio.com',
    name: 'Conta Teste',
    username: null,
    hasPassword: true,
    authProvider: 'local',
    isPlatformAdmin: false,
    statusUsuario: 'ATIVO',
  };
  const sessions = {
    sessions: [
      { id: 'cur', device: 'Chrome em Windows', createdAt: '2026-11-20T10:00:00Z', lastActivity: '2026-11-21T10:00:00Z', current: true },
      { id: 'oth', device: 'Safari em iOS', createdAt: '2026-11-19T10:00:00Z', lastActivity: '2026-11-20T10:00:00Z', current: false },
    ],
  };

  const visitProfile = (user) => {
    cy.seedSession({ user });
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user } }).as('me');
    cy.intercept('GET', '**/api/auth/sessions', { statusCode: 200, body: sessions }).as('sessions');
    cy.visit('/profile.html');
    cy.wait('@sessions');
  };

  it('B1-FE-001 | perfil mostra usuario, sessoes e atalho da empresa', () => {
    visitProfile(baseUser);
    cy.get('#profile-username-input').should('exist');
    cy.get('#profile-sessions').should('contain', 'Chrome em Windows').and('contain', 'este dispositivo');
    cy.get('#profile-sessions').should('contain', 'Safari em iOS');
    cy.get('#profile-company-link').should('have.attr', 'href', '/appearance.html');
  });

  it('B1-FE-002 | salva o usuario (@) pela API', () => {
    cy.intercept('PUT', '**/api/auth/me', (req) => {
      expect(req.body.username).to.equal('meu.usuario');
      req.reply({ statusCode: 200, body: { user: { ...baseUser, username: 'meu.usuario' } } });
    }).as('saveUser');
    visitProfile(baseUser);
    cy.get('#profile-username-input').type('meu.usuario');
    cy.get('#profile-username-save').click();
    cy.wait('@saveUser');
    cy.get('#profile-username-error').should('contain', 'Usu');
  });

  it('B1-FE-003 | encerra uma sessao de outro dispositivo', () => {
    cy.intercept('DELETE', '**/api/auth/sessions/oth', { statusCode: 204 }).as('revoke');
    visitProfile(baseUser);
    cy.get('[data-revoke="oth"]').click();
    cy.wait('@revoke');
    cy.get('#sessions-message').should('contain', 'encerrada');
  });

  it('B1-FE-004 | conta Google sem senha troca o formulario por envio de link', () => {
    cy.intercept('POST', '**/api/auth/forgot', { statusCode: 200, body: { message: 'ok' } }).as('forgot');
    visitProfile({ ...baseUser, hasPassword: false, authProvider: 'google' });
    cy.get('#password-form').should('not.be.visible');
    cy.get('#password-google-notice').should('contain', baseUser.email);
    cy.get('#password-send-link').click();
    cy.wait('@forgot').its('request.body.email').should('eq', baseUser.email);
    cy.get('#password-link-message').should('contain', 'link');
  });

  it('B1-FE-005 | usuario comum nao acessa o monitoramento de erros', () => {
    cy.seedSession({ user: baseUser });
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user: baseUser } });
    cy.visit('/error-monitoring.html');
    cy.location('pathname', { timeout: 8000 }).should('eq', '/dashboard.html');
  });

  it('B1-FE-006 | onboarding aparece no dashboard e pode ser dispensado', () => {
    cy.stubAuthenticated({ ...baseUser });
    cy.stubDashboardMetrics();
    cy.intercept('GET', '**/api/analytics/overview*', {
      statusCode: 200,
      body: { customers: 0, products: 0, recipes: 0, linkedProducts: 0, salesCount: 0 },
    });
    cy.visit('/dashboard.html', { onBeforeLoad: (win) => win.localStorage.removeItem('sgvc.onboarding.dismissed') });
    cy.get('#onboarding-card').should('contain', 'Primeiros passos').and('contain', 'primeiro cliente');
    cy.get('#onboarding-dismiss').click();
    cy.get('#onboarding-card').should('not.exist');
  });
});
