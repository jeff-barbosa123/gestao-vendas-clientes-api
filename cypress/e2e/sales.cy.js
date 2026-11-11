describe('SGVC - Gerenciamento de Vendas', () => {
  beforeEach(() => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
  });

  it('carrega lista de vendas', () => {
    cy.intercept('GET', '**/api/sales', { fixture: 'sales-list.json' }).as('salesList');
    cy.visit('/sales.html');
    cy.wait('@salesList');
    cy.get('#sales-body, table.sales-table').should('exist');
  });

  it('cria nova venda', () => {
    cy.intercept('GET', '**/api/customers', { fixture: 'customers-list.json' }).as('customersList');
    cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' }).as('productsList');
    cy.intercept('POST', '**/api/sales', {
      statusCode: 201,
      body: { id: 'sale-1', total: 99.99 },
    }).as('createSale');

    cy.visit('/sales.html');
    cy.get('#create-sale-btn, #add-sale-btn').click();
    
    // Preencher formulário de venda
    cy.get('#sale-customer, #customer-select').select(0);
    cy.get('#sale-products, #products-select').select(0);
    cy.get('#sale-quantity, #quantity-input').type('2');
    cy.get('#sale-submit, #create-submit').click();
    
    cy.wait('@createSale');
    cy.get('.notification.is-success, #sales-message').should('be.visible');
  });

  it('calcula total da venda automaticamente', () => {
    cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' }).as('productsList');
    cy.visit('/sales.html');
    cy.get('#create-sale-btn, #add-sale-btn').click();
    
    cy.get('#sale-products, #products-select').select(0);
    cy.get('#sale-quantity, #quantity-input').type('3');
    cy.get('#sale-total, #total-display').should('not.be.empty');
  });

  it('mostra detalhes da venda', () => {
    cy.intercept('GET', '**/api/sales', { fixture: 'sales-list.json' }).as('salesList');
    cy.visit('/sales.html');
    cy.wait('@salesList');
    
    cy.get('#sales-body tr, .sale-row').first().click();
    cy.get('#sale-details, .sale-modal').should('be.visible');
  });

  it('cancela venda com confirmacao', () => {
    cy.intercept('GET', '**/api/sales', { fixture: 'sales-list.json' }).as('salesList');
    cy.intercept('PUT', '**/api/sales/**', { statusCode: 200 }).as('cancelSale');

    cy.visit('/sales.html');
    cy.wait('@salesList');
    
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });
    
    cy.get('#sales-body tr').first().find('button[aria-label*="cancelar"], .cancel-btn').click();
    cy.wait('@cancelSale');
    cy.get('.notification.is-success').should('be.visible');
  });

  it('filtra vendas por periodo', () => {
    cy.intercept('GET', '**/api/sales**', { fixture: 'sales-list.json' }).as('salesFiltered');
    cy.visit('/sales.html');
    
    cy.get('#date-from, #start-date').type('2025-01-01');
    cy.get('#date-to, #end-date').type('2025-01-31');
    cy.get('#filter-btn, #apply-filter').click();
    
    cy.wait('@salesFiltered');
  });
});
