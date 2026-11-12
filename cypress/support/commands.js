const DEFAULT_LOGIN_PAYLOAD = {
  token: 'sgvc-test-token',
  refreshToken: 'sgvc-refresh-token',
  user: { id: 'admin-user', email: 'admin@negocio.com' },
};

const DEFAULT_ME_USER = { id: 'admin-user', email: 'admin@negocio.com', name: 'Administrador' };

// A sessão real é um cookie HttpOnly validado em /api/auth/me. Nos testes com API simulada,
// "estar logado" = /api/auth/me responder 200 (e /api/auth/csrf não falhar).
Cypress.Commands.add('stubAuthenticated', (user = DEFAULT_ME_USER) => {
  Cypress.env('sgvcMockApi', 'auth');
  cy.intercept({ method: 'GET', url: '**/api/auth/me' }, { statusCode: 200, body: { user } }).as('authMe');
  cy.intercept({ method: 'GET', url: '**/api/auth/csrf' }, {
    statusCode: 200,
    headers: { 'set-cookie': 'sgvc_csrf=cypress-csrf; Path=/' },
    body: { csrfToken: 'cypress-csrf' },
  }).as('authCsrf');
});

Cypress.Commands.add('stubUnauthenticated', () => {
  Cypress.env('sgvcMockApi', 'anon');
  cy.intercept({ method: 'GET', url: '**/api/auth/me' }, {
    statusCode: 401,
    body: { success: false, message: 'Token inválido ou ausente' },
  }).as('authMe');
});

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
  const statusCode = overrides.statusCode || 200;
  const body = overrides.body || DEFAULT_LOGIN_PAYLOAD;
  cy.intercept({ method: 'POST', url: '**/api/auth/login' }, (req) => {
    req.reply({ statusCode, delay: overrides.delay || 0, body });
  }).as(alias);
  // Login simulado com sucesso: as páginas seguintes consultam /api/auth/me
  if (statusCode < 400) {
    cy.stubAuthenticated({ ...DEFAULT_ME_USER, ...(body && body.user ? body.user : {}) });
  }
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
  cy.intercept({ method: 'GET', pathname: '/api/customers' }, (req) => {
    req.reply(buildReply(options, { fixture: 'customers-list.json' }));
  }).as(alias);
});

Cypress.Commands.add('seedSession', (payload = DEFAULT_LOGIN_PAYLOAD) => {
  cy.stubAuthenticated({ ...DEFAULT_ME_USER, ...(payload && payload.user ? payload.user : {}) });
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
  cy.stubUnauthenticated();
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

// ---------- Backend real ----------
// Cada spec com backend real cria o próprio usuário: não depende do admin do seed
// (que pode estar bloqueado por tentativas) nem enche a conta dele com dados de teste.
Cypress.Commands.add('createRealUser', (prefix = 'e2e') => {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const user = {
    name: `Usuario E2E ${stamp}`,
    email: `${prefix}.${stamp}@sgvc-e2e.test`,
    password: `E2e@${stamp}`,
  };
  return cy
    .request({ method: 'POST', url: '/api/auth/register', body: user, failOnStatusCode: false })
    .then((res) => {
      expect(res.status, `cadastro do usuário de teste: ${JSON.stringify(res.body)}`).to.be.oneOf([200, 201]);
      return cy.wrap(user, { log: false });
    });
});

Cypress.Commands.add('loginReal', (user) =>
  cy.request('POST', '/api/auth/login', { email: user.email, password: user.password }).its('status').should('eq', 200)
);

// Requisição de escrita com o token CSRF do cookie (como as telas fazem)
Cypress.Commands.add('apiReal', (method, url, body) =>
  cy
    .request('/api/auth/csrf')
    .then(() => cy.getCookie('sgvc_csrf'))
    .then((cookie) =>
      cy.request({ method, url, body, headers: { 'X-CSRF-Token': cookie ? cookie.value : '' } })
    )
);
