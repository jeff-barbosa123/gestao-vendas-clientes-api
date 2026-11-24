// Fase 2: perfis/permissoes na interface, tela Equipe, aceite de convite e modulos opcionais.
describe('SGVC - Fase 2: equipe, perfis e modulos', () => {
  // O menu pode estar recolhido (mobile); por isso checamos o atributo hidden do item, nao a visibilidade.
  const navItem = (href) => cy.get('.app-nav-links a[href="' + href + '"]').parent('li');
  const navShown = (href) => navItem(href).should('not.have.attr', 'hidden');
  const navHidden = (href) => navItem(href).should('have.attr', 'hidden');
  const ALL_MODULES = { producao: true, encomendas: true };
  const owner = {
    id: 'o1', email: 'dono@negocio.com', name: 'Dono', role: 'owner',
    permissions: ['customers:read', 'customers:write', 'products:read', 'products:write', 'sales:read', 'sales:write', 'orders:read', 'orders:write', 'recipes:read', 'recipes:write', 'ingredients:read', 'ingredients:write', 'analytics:read', 'finance:view', 'cost:view', 'export:use', 'branding:write', 'team:manage', 'modules:manage'],
    modules: ALL_MODULES,
  };
  const seller = {
    id: 's1', email: 'vend@negocio.com', name: 'Vendedora', role: 'seller',
    permissions: ['customers:read', 'customers:write', 'products:read', 'sales:read', 'sales:write', 'orders:read', 'orders:write', 'analytics:read'],
    modules: ALL_MODULES,
  };
  const overviewSeller = { customers: 3, products: 5, recipes: 1, linkedProducts: 1, salesCount: 2, stockAlerts: [] };

  const visitDashboard = (user, overview) => {
    cy.stubAuthenticated(user);
    cy.stubDashboardMetrics();
    cy.intercept('GET', '**/api/analytics/overview*', { statusCode: 200, body: overview }).as('overview');
    cy.visit('/dashboard.html', { onBeforeLoad: (win) => win.localStorage.setItem('sgvc.onboarding.dismissed', '1') });
    cy.wait('@overview');
  };

  it('FASE2-FE-001 | vendedor nao ve custo/CMV, relatorios nem insumos', () => {
    visitDashboard(seller, overviewSeller);
    navShown('/sales.html');
    navShown('/clients.html');
    navHidden('/reports.html');
    navHidden('/ingredients.html');
    navHidden('/recipes.html');
    cy.get('.app-nav-links a[href="/team.html"]').should('not.exist');
    cy.get('#metric-cmv').should('not.be.visible');
    cy.get('#metric-profit').should('not.be.visible');
    cy.get('#metric-margin').should('not.be.visible');
    navHidden('/reports.html');
    cy.get('#reports-btn').should('not.exist');
    cy.get('#metric-customers').should('be.visible');
    cy.get('#dashboard-message').should('have.class', 'is-hidden');
  });

  it('FASE2-FE-002 | dono ve tudo e o atalho de Equipe', () => {
    visitDashboard(owner, { ...overviewSeller, cmvTotal: 10, profitTotal: 5, margin: 0.3, revenueTotal: 15 });
    cy.get('#metric-cmv').should('be.visible');
    navShown('/reports.html');
    cy.get('#reports-btn').should('not.exist');
    navShown('/team.html');
    cy.get('.app-nav-links a[href="/team.html"]').should('contain', 'Equipe');
  });

  it('FASE2-FE-003 | modulo producao desligado esconde insumos e fichas', () => {
    visitDashboard({ ...owner, modules: { producao: false, encomendas: true } }, overviewSeller);
    navHidden('/ingredients.html');
    navHidden('/recipes.html');
    navShown('/orders.html');
    cy.get('#metric-recipes').should('not.be.visible');
  });

  it('FASE2-FE-004 | vendedor que abre uma tela sem permissao volta ao painel', () => {
    cy.stubAuthenticated(seller);
    cy.stubDashboardMetrics();
    cy.visit('/reports.html');
    cy.location('pathname', { timeout: 8000 }).should('eq', '/dashboard.html');
  });

  const roles = [{ value: 'manager', label: 'Gerente' }, { value: 'seller', label: 'Vendedor/Caixa' }, { value: 'stockist', label: 'Estoquista' }];
  const members = [
    { id: 'o1', name: 'Dono', email: 'dono@negocio.com', role: 'owner', isOwner: true },
    { id: 'm1', name: 'Maria', email: 'maria@x.com', role: 'seller', roleLabel: 'Vendedor/Caixa', isOwner: false },
  ];

  it('FASE2-FE-005 | tela Equipe: lista, convida (com link) e troca perfil', () => {
    cy.stubAuthenticated(owner);
    cy.intercept('GET', '**/api/team', { statusCode: 200, body: { members, invitations: [], roles } }).as('team');
    cy.intercept('POST', '**/api/team/invitations', (req) => {
      expect(req.body).to.deep.equal({ email: 'novo@x.com', role: 'stockist' });
      req.reply({ statusCode: 201, body: { invitation: { id: 'i1', email: 'novo@x.com', role: 'stockist' }, inviteUrl: 'http://localhost:4000/accept-invite.html?token=abc' } });
    }).as('invite');
    cy.intercept('PUT', '**/api/team/members/m1', (req) => {
      expect(req.body).to.deep.equal({ role: 'manager' });
      req.reply({ statusCode: 200, body: { ok: true } });
    }).as('role');
    cy.visit('/team.html');
    cy.wait('@team');
    cy.get('#team-members').should('contain', 'Maria').and('contain', 'Dono');
    cy.get('[data-role-for="m1"]').select('manager');
    cy.wait('@role');
    cy.get('#team-message').should('contain', 'Perfil atualizado');
    cy.get('#invite-email').type('novo@x.com');
    cy.get('#invite-role').select('stockist');
    cy.get('#invite-submit').click();
    cy.wait('@invite');
    cy.get('#invite-link').should('have.value', 'http://localhost:4000/accept-invite.html?token=abc');
  });

  it('FASE2-FE-006 | convite aceito leva ao painel', () => {
    cy.intercept('GET', '**/api/auth/invitations/tok123', { statusCode: 200, body: { email: 'novo@x.com', role: 'seller', roleLabel: 'Vendedor/Caixa', companyName: 'Padaria Boa' } }).as('info');
    cy.intercept('POST', '**/api/auth/invitations/tok123/accept', (req) => {
      expect(req.body).to.deep.equal({ name: 'Novo Membro', password: 'Equipe@12345' });
      req.reply({ statusCode: 201, body: { token: 't', refreshToken: 'r', user: { id: 'u' } } });
    }).as('accept');
    cy.intercept('GET', '**/api/auth/csrf', { statusCode: 200, body: { csrfToken: 'x' } });
    cy.visit('/accept-invite.html?token=tok123');
    cy.wait('@info');
    cy.get('#invite-summary').should('contain', 'Padaria Boa').and('contain', 'Vendedor/Caixa');
    cy.get('#invite-email-view').should('have.value', 'novo@x.com');
    cy.get('#invite-name').type('Novo Membro');
    cy.get('#invite-password').type('Equipe@12345');
    cy.get('#invite-password2').type('Equipe@12345');
    cy.get('#invite-accept').click();
    cy.wait('@accept');
  });

  it('FASE2-FE-007 | convite invalido mostra erro e nao exibe o formulario', () => {
    cy.intercept('GET', '**/api/auth/invitations/ruim', { statusCode: 404, body: { message: 'Convite inválido ou expirado.' } });
    cy.visit('/accept-invite.html?token=ruim');
    cy.get('#invite-error').should('be.visible');
    cy.get('#invite-form').should('not.be.visible');
  });

  it('FASE2-FE-008 | aparencia: dono liga/desliga modulos', () => {
    cy.stubAuthenticated(owner);
    cy.intercept('GET', '**/api/company/modules', { statusCode: 200, body: { modules: ALL_MODULES, catalog: { producao: { label: 'Produção', description: 'Insumos e fichas' }, encomendas: { label: 'Encomendas', description: 'Pedidos' } } } }).as('modules');
    cy.intercept('PUT', '**/api/company/modules', (req) => {
      expect(req.body).to.deep.equal({ producao: false });
      req.reply({ statusCode: 200, body: { modules: { producao: false, encomendas: true } } });
    }).as('save');
    cy.visit('/appearance.html');
    cy.wait('@modules');
    cy.get('#company-modules-card [data-module="producao"]').should('be.checked').uncheck();
    cy.wait('@save');
    cy.get('#modules-message').should('contain', 'atualizados');
  });
});

describe('SGVC - Fase 2: vendedor real navegando sem custos (API real)', () => {
  it('FASE2-E2E-001 | vendedor convidado abre painel, produtos, vendas e clientes sem erros', () => {
    cy.createRealUser('f2dono').then((dono) => {
      cy.loginReal(dono);
      const nome = `Produto F2 ${Date.now()}`;
      cy.apiReal('POST', '/api/products', { name: nome, price: 50, purchase_price: 20, stock: 5 }).its('status').should('eq', 201);
      cy.apiReal('POST', '/api/team/invitations', { email: `vend.${Date.now()}@sgvc-e2e.test`, role: 'seller' }).then((res) => {
        expect(res.status).to.eq(201);
        const token = new URL(res.body.inviteUrl).searchParams.get('token');
        cy.clearCookies();
        cy.apiReal('POST', `/api/auth/invitations/${token}/accept`, { name: 'Vendedor E2E', password: 'Equipe@12345' }).its('status').should('eq', 201);
      });
      cy.visit('/dashboard.html');
      cy.get('#dashboard-message', { timeout: 10000 }).should('have.class', 'is-hidden');
      cy.get('#metric-cmv').should('not.be.visible');
      cy.get('.app-nav-links a[href="/team.html"]').should('not.exist');
      cy.visit('/products.html');
      cy.contains(nome, { timeout: 10000 }).should('exist');
      cy.visit('/sales.html');
      cy.get('main').should('exist');
      cy.visit('/clients.html');
      cy.get('main').should('exist');
      cy.visit('/ingredients.html');
      cy.location('pathname', { timeout: 8000 }).should('eq', '/dashboard.html');
      cy.visit('/team.html');
      cy.location('pathname', { timeout: 8000 }).should('eq', '/dashboard.html');
    });
  });
});
