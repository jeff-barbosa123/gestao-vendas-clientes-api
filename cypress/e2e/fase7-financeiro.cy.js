// Fase 7: Financeiro (contas a pagar/receber, fluxo de caixa, DRE) com a API real.
describe('SGVC - Fase 7: Financeiro', () => {
  const today = () => new Date().toISOString().slice(0, 10);

  it('FASE7-E2E-001 | lanca, paga e reabre conta; fluxo de caixa e DRE refletem venda, CMV e despesa', () => {
    cy.createRealUser('f7fin').then((dono) => {
      cy.loginReal(dono);
      const stamp = Date.now();
      cy.apiReal('POST', '/api/products', { name: `Prod Fin ${stamp}`, price: 50, purchase_price: 20 }).then((p) => {
        cy.apiReal('POST', '/api/sales', { date: today(), paymentMethod: 'PIX', items: [{ productId: p.body.id, quantity: 2 }] });
      });

      cy.visit('/finance.html');
      cy.get('#fin-form', { timeout: 10000 }).should('be.visible');
      cy.get('#f-kind').select('PAYABLE');
      cy.get('#f-desc').type(`Energia ${stamp}`);
      cy.get('#f-amount').type('30');
      cy.get('#f-due').type(today());
      cy.get('#f-cat').type('Energia');
      cy.get('#fin-form button[type="submit"]').click();
      cy.get('#fin-message', { timeout: 10000 }).should('contain', 'Lançamento criado');
      const row = () => cy.contains('#fin-body tr', `Energia ${stamp}`, { timeout: 10000 });
      row().should('contain', 'Em aberto');
      row().contains('button', 'Pagar').click();
      row().should('contain', 'Paga');
      row().contains('button', 'Reabrir').click();
      row().should('contain', 'Em aberto');
      row().contains('button', 'Pagar').click();
      row().should('contain', 'Paga');

      cy.get('#fin-kpis').should('contain', 'A pagar em aberto');

      cy.contains('.fin-tabs button', 'Fluxo de caixa').click();
      cy.get('#cf-body', { timeout: 10000 }).should('contain', 'Total').and('contain', '100,00').and('contain', '30,00');

      cy.contains('.fin-tabs button', 'DRE').click();
      cy.get('#dre-body', { timeout: 10000 }).should('contain', 'Receita líquida').and('contain', '100,00').and('contain', 'CMV').and('contain', '40,00');
      cy.get('#dre-body').should('contain', 'Energia').and('contain', 'Resultado operacional').and('contain', '30,00');
    });
  });

  it('FASE7-FE-002 | menu Financeiro depende de finance:view e do modulo; sem finance:manage o formulario some', () => {
    const base = { id: 'u1', email: 'x@negocio.com', name: 'Op', role: 'manager' };
    const nav = (href) => cy.get('.app-nav-links a[href="' + href + '"]').parent('li');
    const overview = { customers: 0, products: 0, recipes: 0, linkedProducts: 0, salesCount: 0, stockAlerts: [] };
    const perms = ['customers:read', 'products:read', 'sales:read', 'analytics:read'];
    cy.stubAuthenticated({ ...base, permissions: [...perms, 'finance:view'], modules: { financeiro: true } });
    cy.stubDashboardMetrics();
    cy.intercept('GET', '**/api/analytics/overview*', { statusCode: 200, body: overview });
    cy.visit('/dashboard.html', { onBeforeLoad: (win) => win.localStorage.setItem('sgvc.onboarding.dismissed', '1') });
    nav('/finance.html').should('exist').and('not.have.attr', 'hidden');

    cy.stubAuthenticated({ ...base, permissions: [...perms, 'finance:view'], modules: { financeiro: false } });
    cy.stubDashboardMetrics();
    cy.intercept('GET', '**/api/analytics/overview*', { statusCode: 200, body: overview });
    cy.visit('/dashboard.html', { onBeforeLoad: (win) => win.localStorage.setItem('sgvc.onboarding.dismissed', '1') });
    nav('/finance.html').should('have.attr', 'hidden');

    cy.stubAuthenticated({ ...base, permissions: perms, modules: { financeiro: true } });
    cy.stubDashboardMetrics();
    cy.intercept('GET', '**/api/analytics/overview*', { statusCode: 200, body: overview });
    cy.visit('/dashboard.html', { onBeforeLoad: (win) => win.localStorage.setItem('sgvc.onboarding.dismissed', '1') });
    nav('/finance.html').should('have.attr', 'hidden');
  });
});
