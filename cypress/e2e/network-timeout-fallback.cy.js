describe('Network - Timeout fallback', () => {
  beforeEach(() => {
    cy.setCookie('sgvc_csrf', 'csrf-test');
    cy.intercept('GET', '**/api/auth/csrf', { statusCode: 200, body: { csrfToken: 'csrf-test' } }).as('csrf');
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user: { id: 'u1', email: 'admin@negocio.com' } } }).as('me');
  });

  it('Requisição com timeout → exibe mensagem de fallback', () => {
    // Todas as chamadas de dados demoram mais que o timeout (o painel tenta outros endpoints antes de desistir)
    cy.intercept({ method: 'GET', url: /\/api\/(?!auth\/)/ }, (req) => {
      req.reply({ statusCode: 200, delay: 1500, body: [] });
    });
    cy.intercept('GET', '**/api/analytics/overview*', (req) => {
      req.reply({
        statusCode: 200,
        delay: 1500,
        body: { customers: 0, sales: 0, revenue: 0, series: [] },
      });
    }).as('overviewSlow');

    // O /config.js do servidor sobrescreve window.APP_CONFIG: injeta o timeout curto nele.
    // Margem folgada (300 ms de timeout x 1500 ms de resposta): 50 ms era apertado demais e abortava ate o /auth/me (stub) em maquina carregada
    cy.request('/config.js').then(({ body }) => {
      cy.intercept('GET', '/config.js', {
        headers: { 'content-type': 'application/javascript' },
        body: `${body}\nwindow.APP_CONFIG.REQUEST_TIMEOUT_MS = 300;`,
      });
    });
    cy.visit('/dashboard.html');

    cy.wait('@me', { timeout: 15000 });
    cy.get('#dashboard-message', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Não foi possível conectar');
  });
});

