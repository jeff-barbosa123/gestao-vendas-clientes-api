// Fase 6: CRM leve (recompra, WhatsApp, historico e anotacoes) com a API real.
describe('SGVC - Fase 6: CRM leve', () => {
  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

  it('FASE6-E2E-001 | lista de recompra, WhatsApp registra contato e historico guarda anotacao', () => {
    cy.createRealUser('f6crm').then((dono) => {
      cy.loginReal(dono);
      const stamp = Date.now();
      cy.apiReal('POST', '/api/products', { name: `Prod CRM ${stamp}`, price: 30, purchase_price: 12 }).then((p) => {
        cy.apiReal('POST', '/api/customers', { name: `Ana ${stamp}`, email: `ana.${stamp}@sgvc-e2e.test`, phone: '(81) 99999-0000' }).then((a) => {
          cy.apiReal('POST', '/api/customers', { name: `Bruno ${stamp}`, email: `bruno.${stamp}@sgvc-e2e.test`, phone: '81988887777' }).then((b) => {
            [100, 70].forEach((d) => cy.apiReal('POST', '/api/sales', { customerId: a.body.id, date: daysAgo(d), paymentMethod: 'PIX', items: [{ productId: p.body.id, quantity: 1 }] }));
            cy.apiReal('POST', '/api/sales', { customerId: b.body.id, date: daysAgo(5), paymentMethod: 'PIX', items: [{ productId: p.body.id, quantity: 2 }] });

            cy.visit('/crm.html', { onBeforeLoad: (win) => cy.stub(win, 'open').as('open') });
            cy.get('#crm-body', { timeout: 10000 }).should('contain', `Ana ${stamp}`).and('contain', `Bruno ${stamp}`);
            cy.contains('#crm-filters button', 'Hora de recomprar (1)').click();
            cy.get('#crm-body').should('contain', `Ana ${stamp}`).and('not.contain', `Bruno ${stamp}`);
            cy.contains('#crm-body tr', `Ana ${stamp}`).find('.crm-badge').should('contain', 'Recompra');

            cy.get('#crm-template').clear().type('Oi {nome}, bora repetir?', { parseSpecialCharSequences: false });
            cy.contains('#crm-body tr', `Ana ${stamp}`).contains('button', 'WhatsApp').click();
            cy.get('@open').should('have.been.calledOnce');
            cy.get('@open').its('firstCall.args.0').should('contain', 'https://wa.me/5581999990000').and('contain', encodeURIComponent(`Oi Ana, bora repetir?`));
            cy.get('#crm-message', { timeout: 10000 }).should('contain', 'Contato com');

            cy.contains('#crm-body tr', `Ana ${stamp}`).contains('button', 'Histórico').click();
            cy.get('#crm-detail').should('be.visible');
            cy.get('#crm-detail-kpis').should('contain', 'Recompra').and('contain', '60,00');
            cy.get('#crm-products').should('contain', `Prod CRM ${stamp}`);
            cy.get('#crm-note').type('Prefere entrega pela manhã');
            cy.get('#crm-note-form button[type="submit"]').click();
            cy.get('#crm-interactions', { timeout: 10000 }).should('contain', 'Prefere entrega pela manhã').and('contain', 'WhatsApp');
          });
        });
      });
    });
  });

  it('FASE6-FE-002 | menu CRM aparece para quem le clientes e some se o modulo estiver desligado', () => {
    const base = { id: 'u1', email: 'x@negocio.com', name: 'Op', role: 'seller', permissions: ['customers:read', 'customers:write', 'products:read', 'sales:read', 'sales:write', 'analytics:read'] };
    const nav = (href) => cy.get('.app-nav-links a[href="' + href + '"]').parent('li');
    const overview = { customers: 0, products: 0, recipes: 0, linkedProducts: 0, salesCount: 0, stockAlerts: [] };
    [[{ crm: true }, 'not.have.attr'], [{ crm: false }, 'have.attr']].forEach(([modules, assertion]) => {
      cy.stubAuthenticated({ ...base, modules });
      cy.stubDashboardMetrics();
      cy.intercept('GET', '**/api/analytics/overview*', { statusCode: 200, body: overview });
      cy.visit('/dashboard.html', { onBeforeLoad: (win) => win.localStorage.setItem('sgvc.onboarding.dismissed', '1') });
      nav('/crm.html').should(assertion, 'hidden');
    });
  });
});
