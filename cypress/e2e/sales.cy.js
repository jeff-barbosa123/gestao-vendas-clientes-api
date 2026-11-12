// Tela de vendas com a API simulada (fixtures). Seletores seguem o layout atual de sales.html.
describe('SGVC - Gerenciamento de Vendas', () => {
  const visitSales = () => {
    cy.intercept('GET', '**/api/sales', { fixture: 'sales-list.json' }).as('salesList');
    cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' }).as('productsList');
    cy.intercept({ method: 'GET', pathname: '/api/customers' }, { fixture: 'customers-list.json' }).as('customersList');
    cy.seedSession();
    cy.visit('/sales.html');
    cy.wait(['@salesList', '@productsList']);
  };

  beforeEach(visitSales);

  it('carrega lista de vendas', () => {
    cy.get('#sales-body tr.sales-row').should('have.length', 2);
    cy.get('#sales-body').should('contain', 'Cliente Teste').and('contain', 'Outro Cliente');
  });

  it('cria nova venda com forma de pagamento', () => {
    cy.intercept('POST', '**/api/sales', (req) => {
      expect(req.body.paymentMethod).to.eq('PIX');
      expect(req.body.items).to.have.length(1);
      expect(req.body.items[0]).to.include({ productId: 'product-1', quantity: 2 });
      req.reply({ statusCode: 201, body: { id: 'sale-3', total: 59.98 } });
    }).as('createSale');

    cy.get('#create-payment').select('PIX');
    cy.get('#item-product').select('product-1');
    cy.get('#item-qty').clear().type('2');
    cy.get('#add-item').click();
    cy.get('#items-body tr').should('have.length', 1);
    cy.get('#create-submit').click();

    cy.wait('@createSale');
    cy.get('#sales-message').should('be.visible').and('contain', 'Venda criada com sucesso');
  });

  it('calcula total da venda automaticamente', () => {
    cy.get('#item-product').select('product-2');
    cy.get('#item-qty').clear().type('3');
    cy.get('#add-item').click();
    cy.get('#sale-total').should('contain', '37,50');
  });

  it('bloqueia venda sem itens', () => {
    cy.intercept('POST', '**/api/sales', cy.spy().as('createSpy'));
    cy.get('#create-submit').click();
    cy.get('@createSpy').should('not.have.been.called');
  });

  it('mostra detalhes da venda', () => {
    cy.intercept('GET', '**/api/sales/sale-1', {
      id: 'sale-1',
      customerName: 'Cliente Teste',
      total: 99.99,
      date: '2025-01-27T10:00:00Z',
      status: 'ACTIVE',
      paymentMethod: 'CASH',
      items: [{ productId: 'product-1', productName: 'Bolo de Chocolate', quantity: 2, unitPrice: 29.99 }],
    }).as('saleDetail');
    cy.get('#sales-body button[data-view-id="sale-1"]').contains('Detalhes').click();
    cy.wait('@saleDetail');
    cy.get('#sale-details-modal').should('have.class', 'is-active');
    cy.get('#sale-details-payment').should('contain', 'Dinheiro');
    cy.get('#sale-details-items').should('contain', 'Bolo de Chocolate');
  });

  it('cancela venda com confirmacao', () => {
    cy.intercept('POST', '**/api/sales/sale-1/cancel', { statusCode: 200, body: { id: 'sale-1', status: 'CANCELED' } }).as('cancelSale');
    cy.get('#sales-body button[data-cancel-id="sale-1"]').click();
    cy.get('#cancel-sale-modal').should('have.class', 'is-active');
    cy.get('#cancel-sale-confirm').click();
    cy.wait('@cancelSale');
    cy.get('#sales-message').should('contain', 'Venda cancelada');
  });

  it('filtra vendas por status', () => {
    cy.get('#filter-status').select('CANCELADA');
    cy.get('#sales-body tr.sales-row').should('have.length', 0);
    cy.get('#filter-status').select('ATIVA');
    cy.get('#sales-body tr.sales-row').should('have.length', 2);
  });
});
