// Fluxos complementares do dashboard (baseline antes da modularizacao de dashboard.js).
describe('SGVC - Dashboard: fluxos complementares', () => {
  const visitDashboard = (orders = []) => {
    cy.intercept('GET', '**/api/**', { body: [] });
    cy.intercept('GET', '**/api/orders*', { body: orders }).as('orders');
    cy.stubDashboardMetrics();
    cy.seedSession();
    cy.visit('/dashboard.html');
    cy.wait('@dashboardOverview');
  };

  it('exibe as metricas principais da API', () => {
    visitDashboard();
    cy.get('#metric-customers').should('contain', '14');
    cy.get('#metric-sales').should('contain', '48');
    cy.get('#metric-products').should('contain', '34');
    cy.get('#metric-recipes').should('contain', '18');
  });

  it('trocar o periodo recarrega a visao geral com intervalo de datas', () => {
    visitDashboard();
    cy.intercept('GET', '**/api/analytics/overview*', (req) => {
      expect(req.url).to.match(/start=\d{4}-\d{2}-\d{2}/);
      expect(req.url).to.match(/end=\d{4}-\d{2}-\d{2}/);
      req.reply({ fixture: 'dashboard-overview.json' });
    }).as('overviewPeriod');
    cy.get('#dashboard-period').select('year');
    cy.wait('@overviewPeriod');
    cy.get('#metric-customers').should('contain', '14');
  });

  it('lista as encomendas dos proximos 7 dias', () => {
    const delivery = new Date(Date.now() + 2 * 864e5).toISOString();
    visitDashboard([
      { id: 'o1', customerName: 'Maria', total: 120, deliveryAt: delivery },
      { id: 'o2', customerName: 'Joao', total: 80, deliveryAt: delivery },
    ]);
    cy.wait('@orders');
    cy.get('#alert-orders-message').should('contain', '2 encomenda(s)');
    cy.get('#alert-orders-list li').should('have.length', 2);
    cy.get('#alert-orders-list').should('contain', 'Maria').and('contain', 'Joao');
  });

  it('mostra mensagem quando nao ha encomendas', () => {
    visitDashboard([]);
    cy.wait('@orders');
    cy.get('#alert-orders-message').should('contain', 'Nenhuma encomenda');
  });

  [
    ['#reports-btn', '/reports.html'],
    ['#profile-btn', '/profile.html'],
    ['#sales-manage-action', '/sales.html'],
    ['#products-manage-action', '/products.html'],
    ['#recipes-manage-action', '/recipes.html'],
    ['#linked-manage-action', '/vinculos.html'],
    ['#margin-manage-action', '/simulacao.html'],
    ['#quick-sale-action', '/sales.html'],
    ['#quick-client-action', '/clients.html'],
    ['#quick-product-action', '/products.html'],
  ].forEach(([selector, path]) => {
    it(`${selector} navega para ${path}`, () => {
      visitDashboard();
      cy.get(selector).click({ force: true });
      cy.location('pathname').should('eq', path);
    });
  });
});
