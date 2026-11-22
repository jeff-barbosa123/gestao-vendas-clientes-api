// Fase 5: Caixa/PDV (abertura/fechamento, venda por codigo de barras, troco, CMV oculto sem finance:view).
describe('SGVC - Fase 5: Caixa/PDV', () => {
  const navItem = (href) => cy.get('.app-nav-links a[href="' + href + '"]').parent('li');

  it('FASE5-E2E-001 | abre caixa, vende por codigo de barras com troco e fecha conferindo o dinheiro (API real)', () => {
    cy.createRealUser('f5dono').then((dono) => {
      cy.loginReal(dono);
      const nome = `Produto PDV ${Date.now()}`;
      const barcode = `789${Date.now()}`.slice(0, 13);
      cy.apiReal('POST', '/api/products', { name: nome, price: 25, purchase_price: 10, stock: 10 }).then((res) => {
        cy.apiReal('PUT', `/api/pdv/products/${res.body.id}/barcode`, { barcode }).its('status').should('eq', 200);
      });

      cy.visit('/pdv.html');
      cy.get('#pdv-opening', { timeout: 10000 }).type('100');
      cy.get('#pdv-open-btn').click();
      cy.get('#pdv-register-card', { timeout: 10000 }).should('be.visible');
      cy.get('#pdv-k-cash').should('contain', '100,00');

      // Leitor de codigo de barras: digita o codigo e Enter adiciona direto ao carrinho.
      cy.get('#pdv-search').type(`${barcode}{enter}`);
      cy.get('#pdv-cart-body').should('contain', nome);
      cy.get('#pdv-total').should('contain', '25,00');
      cy.get('#pdv-finish').should('be.disabled');

      cy.get('#pdv-pays [data-field="amount"]').type('50');
      cy.get('#pdv-balance').should('contain', 'Troco').and('contain', '25,00');
      cy.get('#pdv-finish').should('not.be.disabled').click();
      cy.get('#pdv-message', { timeout: 10000 }).should('contain', 'Venda registrada').and('contain', 'Troco');
      cy.get('#pdv-k-count').should('have.text', '1');
      cy.get('#pdv-k-cash').should('contain', '125,00');
      // Dono tem finance:view: CMV e lucro aparecem.
      cy.get('#pdv-k-cmv').should('contain', '10,00');
      cy.get('#pdv-k-profit').should('contain', '15,00');

      cy.get('#pdv-close-toggle').click();
      cy.get('#pdv-counted').type('125');
      cy.get('#pdv-close-form button[type="submit"]').click();
      cy.get('#pdv-closed-card', { timeout: 10000 }).should('be.visible').and('contain', 'sem diferença');
      cy.get('#pdv-open-card').should('be.visible');
    });
  });

  it('FASE5-E2E-002 | pagamento dividido (Pix + dinheiro) e sangria na tela (API real)', () => {
    cy.createRealUser('f5div').then((dono) => {
      cy.loginReal(dono);
      const nome = `Divide ${Date.now()}`;
      cy.apiReal('POST', '/api/products', { name: nome, price: 40, purchase_price: 15, stock: 5 });
      cy.apiReal('POST', '/api/pdv/registers/open', { openingAmount: 50 });
      cy.visit('/pdv.html');
      cy.get('#pdv-search', { timeout: 10000 }).type(`${nome}{enter}`);
      cy.get('#pdv-cart-body').should('contain', nome);
      cy.get('#pdv-pays [data-field="amount"]').type('10');
      cy.get('#pdv-pay-add').click();
      cy.get('#pdv-pays [data-field="amount"]').last().should('have.value', '30,00');
      cy.get('#pdv-balance').should('contain', 'Troco').and('contain', '0,00');
      cy.get('#pdv-finish').click();
      cy.get('#pdv-message', { timeout: 10000 }).should('contain', 'Venda registrada');
      cy.get('#pdv-k-methods').should('contain', 'Dinheiro').and('contain', 'Pix');

      cy.get('#pdv-move-toggle').click();
      cy.get('#pdv-move-type').select('SANGRIA');
      cy.get('#pdv-move-amount').type('20');
      cy.get('#pdv-move-form button[type="submit"]').click();
      cy.get('#pdv-message').should('contain', 'Movimentação registrada');
      // 50 + 10 (dinheiro) - 20 = 40
      cy.get('#pdv-k-cash').should('contain', '40,00');
    });
  });

  it('FASE5-FE-003 | vendedor usa o PDV sem ver CMV/lucro; estoquista nao ve o menu do PDV', () => {
    const base = { id: 'u1', email: 'x@negocio.com', name: 'Op', modules: { producao: true, encomendas: true, pdv: true } };
    const seller = { ...base, role: 'seller', permissions: ['customers:read', 'products:read', 'sales:read', 'sales:write', 'pdv:use', 'analytics:read'] };
    cy.stubAuthenticated(seller);
    cy.intercept('GET', '**/api/pdv/session', {
      statusCode: 200,
      body: { register: { id: 'r1', status: 'OPEN', openedAt: new Date().toISOString(), openingAmount: 20, salesCount: 2, salesTotal: 80, expectedCash: 70, payments: [{ method: 'CASH', amount: 50 }] } },
    }).as('session');
    cy.visit('/pdv.html');
    cy.wait('@session');
    cy.get('#pdv-register-card').should('be.visible');
    cy.get('#pdv-k-total').should('contain', '80,00');
    cy.get('#pdv-k-cmv').should('not.be.visible');
    cy.get('#pdv-k-profit').should('not.be.visible');
    navItem('/pdv.html').should('not.have.attr', 'hidden');

    const stockist = { ...base, role: 'stockist', permissions: ['products:read', 'products:write', 'ingredients:read', 'ingredients:write', 'recipes:read', 'analytics:read', 'cost:view'] };
    cy.stubAuthenticated(stockist);
    cy.stubDashboardMetrics();
    cy.intercept('GET', '**/api/analytics/overview*', { statusCode: 200, body: { customers: 0, products: 0, recipes: 0, linkedProducts: 0, salesCount: 0, stockAlerts: [] } });
    cy.visit('/dashboard.html', { onBeforeLoad: (win) => win.localStorage.setItem('sgvc.onboarding.dismissed', '1') });
    navItem('/pdv.html').should('have.attr', 'hidden');
  });
});
