describe('SGVC - Login e sessao', () => {
  beforeEach(() => {
    cy.clearSession();
  });

  it('Login valido deve levar ao dashboard', () => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
    cy.get('#metric-customers').should('contain', '14');
    cy.get('#clients-manage-action').should('be.visible');
  });

  it('Login invalido com email errado mostra mensagem', () => {
    cy.intercept({ method: 'POST', url: '**/api/auth/login' }, { statusCode: 401, body: { error: 'Credenciais invalidas' } }).as('loginFailEmail');
    cy.visit('/');
    cy.get('#email').type('emailerrado@teste.com');
    cy.get('#password').type('Admin@123!');
    cy.get('#login-btn').click();
    cy.wait('@loginFailEmail');
    cy.get('#login-error-text').should('contain', 'E-mail ou senha incorretos');
  });

  it('Login invalido com senha errada deve mostrar erro', () => {
    cy.intercept({ method: 'POST', url: '**/api/auth/login' }, { statusCode: 401, body: { error: 'Senha invalida' } }).as('loginFailPassword');
    cy.visit('/');
    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('Senha@Errada123!');
    cy.get('#login-btn').click();
    cy.wait('@loginFailPassword');
    cy.get('#login-error-text').should('contain', 'E-mail ou senha incorretos');
  });

  it('Campos vazios entao alerta de obrigatorios', () => {
    cy.visit('/');
    cy.get('#login-btn').click();
    // A tela valida um campo por vez, começando pelo e-mail
    cy.get('#email-error').should('contain', 'E-mail obrigatório.');
    cy.get('#email').type('admin@negocio.com');
    cy.get('#login-btn').click();
    cy.get('#password-error').should('contain', 'Senha obrigatória.');
  });

  it('Sessao persiste apos recarregar o dashboard', () => {
    cy.stubDashboardMetrics({ alias: 'dashboardOverview', response: { fixture: 'dashboard-overview.json' } });
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
    // Sessão em cookie HttpOnly: nada no storage, e o reload continua logado (/api/auth/me)
    cy.window().its('sessionStorage').invoke('getItem', 'sgvc.session').should('be.null');
    cy.reload();
    cy.wait('@dashboardOverview');
    cy.location('pathname').should('eq', '/dashboard.html');
  });

  it('Logout remove sessao e retorna para login', () => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
    cy.intercept({ method: 'POST', url: '**/api/auth/logout' }, { statusCode: 204 }).as('logout');
    cy.get('#logout-btn').click();
    cy.wait('@logout');
    cy.location('pathname').should('eq', '/');
    cy.window().then((win) => {
      // Verificar que sessionStorage foi limpo
      expect(win.sessionStorage.getItem('sgvc.session')).to.be.null;
      // Verificar que localStorage também foi limpo (migração)
      expect(win.localStorage.getItem('sgvc.session')).to.be.null;
    });
  });

  it('Token expirado redireciona para login automaticamente', () => {
    cy.stubDashboardMetrics({ statusCode: 401 });
    cy.visitWithSession('/dashboard.html');
    cy.wait('@dashboardOverview');
    cy.location('pathname').should('eq', '/');
  });

  it('Atualizar pagina recarrega os indicadores sem sair', () => {
    cy.stubDashboardMetrics({ alias: 'overviewLoad' });
    cy.loginAsAdmin();
    cy.wait('@overviewLoad');
    cy.reload();
    cy.wait('@overviewLoad');
    cy.location('pathname').should('eq', '/dashboard.html');
  });

  it('Acesso direto sem login e redireciona para a pagina inicial', () => {
    cy.visit('/clients.html');
    cy.location('pathname').should('eq', '/');
  });

  it('Redirecionamento garante dashboard apos login com query', () => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin({ startPath: '/index.html?next=/clients.html' });
    cy.wait('@dashboardOverview');
    cy.location('pathname').should('eq', '/dashboard.html');
    cy.location('search').should('eq', '');
  });

  it('Refresh da sessao segue funcionando apos login', () => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
    cy.reload();
    cy.wait('@dashboardOverview');
    cy.location('pathname').should('eq', '/dashboard.html');
  });
});
