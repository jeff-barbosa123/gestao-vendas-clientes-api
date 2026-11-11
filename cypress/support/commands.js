const DEFAULT_LOGIN_PAYLOAD = {
  token: 'sgvc-test-token',
  refreshToken: 'sgvc-refresh-token',
  user: { id: 'admin-user', email: 'admin@negocio.com' },
};

function buildReply(options = {}, defaultResponse = { fixture: 'dashboard-overview.json' }) {
  const payload = options.response || defaultResponse;
  return {
    statusCode: options.statusCode || 200,
    delay: options.delay || 0,
    ...payload,
  };
}

Cypress.Commands.add('interceptLogin', (overrides = {}) => {
  const alias = overrides.alias || 'loginRequest';
  cy.intercept({ method: 'POST', url: '**/api/auth/login' }, (req) => {
    req.reply({
      statusCode: overrides.statusCode || 200,
      delay: overrides.delay || 0,
      body: overrides.body || DEFAULT_LOGIN_PAYLOAD,
    });
  }).as(alias);
});

Cypress.Commands.add('loginAsAdmin', (overrides = {}) => {
  const alias = overrides.alias || 'loginRequest';
  cy.interceptLogin({ ...overrides, alias });
  if (!overrides.skipVisit) {
    cy.visit(overrides.startPath || '/');
  }
  cy.get('#email').clear().type('admin@negocio.com');
  // Updated to use strong password that meets new requirements
  cy.get('#password').clear().type('Admin@123!');
  cy.get('#login-btn').click();
  cy.wait(`@${alias}`);
  cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard.html');
});

Cypress.Commands.add('stubDashboardMetrics', (options = {}) => {
  const alias = options.alias || 'dashboardOverview';
  cy.intercept({ method: 'GET', url: '**/api/analytics/overview*' }, (req) => {
    req.reply(buildReply(options, { fixture: 'dashboard-overview.json' }));
  }).as(alias);
});

Cypress.Commands.add('stubCustomerList', (options = {}) => {
  const alias = options.alias || 'customersList';
  cy.intercept({ method: 'GET', url: '**/api/customers' }, (req) => {
    req.reply(buildReply(options, { fixture: 'customers-list.json' }));
  }).as(alias);
});

Cypress.Commands.add('seedSession', (payload = DEFAULT_LOGIN_PAYLOAD) => {
  cy.window().then((win) => {
    const session = {
      token: payload.token,
      refreshToken: payload.refreshToken,
      user: payload.user,
    };
    // Updated to use sessionStorage instead of localStorage
    win.sessionStorage.setItem('sgvc.session', JSON.stringify(session));
    // Also clear localStorage if exists (migration cleanup)
    win.localStorage.removeItem('sgvc.session');
  });
});

Cypress.Commands.add('clearSession', () => {
  cy.window().then((win) => {
    win.sessionStorage.removeItem('sgvc.session');
    win.localStorage.removeItem('sgvc.session'); // Cleanup legacy
  });
});

Cypress.Commands.add('visitWithSession', (path = '/dashboard.html', payload = DEFAULT_LOGIN_PAYLOAD) => {
  cy.seedSession(payload);
  cy.visit(path);
});

Cypress.Commands.add('openClientsFromDashboard', () => {
  cy.get('#clients-manage-action').should('be.visible').click();
  cy.location('pathname').should('eq', '/clients.html');
});
