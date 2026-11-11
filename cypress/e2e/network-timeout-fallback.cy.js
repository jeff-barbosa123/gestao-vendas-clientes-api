describe('Network - Timeout fallback', () => {
  beforeEach(() => {
    cy.setCookie('sgvc_csrf', 'csrf-test');
    cy.intercept('GET', '**/api/auth/csrf', { statusCode: 200, body: { csrfToken: 'csrf-test' } }).as('csrf');
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user: { id: 'u1', email: 'admin@negocio.com' } } }).as('me');
  });

  it('Requisição com timeout → exibe mensagem de fallback', () => {
    cy.intercept('GET', '**/api/analytics/overview*', (req) => {
      req.reply({
        statusCode: 200,
        delay: 250,
        body: { customers: 0, sales: 0, revenue: 0, series: [] },
      });
    }).as('overviewSlow');

    cy.visit('/dashboard.html', {
      onBeforeLoad(win) {
        win.APP_CONFIG = Object.assign({}, win.APP_CONFIG || {}, { REQUEST_TIMEOUT_MS: 50 });
      },
    });

    cy.wait('@me');
    cy.get('#dashboard-message', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Não foi possível conectar');
  });
});

