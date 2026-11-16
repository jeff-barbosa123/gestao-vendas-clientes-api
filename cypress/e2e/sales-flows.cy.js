// Fluxos complementares da tela de vendas (baseline antes da modularizacao de sales.js).
describe('SGVC - Vendas: fluxos complementares', () => {
  const saleDetail = {
    id: 'sale-1',
    customerName: 'Cliente Teste',
    total: 99.99,
    date: '2025-01-27T10:00:00Z',
    status: 'ACTIVE',
    paymentMethod: 'CASH',
    items: [{ productId: 'product-1', productName: 'Bolo de Chocolate', quantity: 2, unitPrice: 29.99 }],
  };

  beforeEach(() => {
    cy.intercept('GET', '**/api/sales', { fixture: 'sales-list.json' }).as('salesList');
    cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' }).as('productsList');
    cy.intercept({ method: 'GET', pathname: '/api/customers' }, { fixture: 'customers-list.json' }).as('customersList');
    cy.seedSession();
    cy.visit('/sales.html');
    cy.wait(['@salesList', '@productsList']);
    cy.get('#sales-body tr.sales-row').should('have.length', 2);
  });

  it('edita venda existente enviando PUT com itens e data', () => {
    cy.intercept('GET', '**/api/sales/sale-1', saleDetail).as('saleDetail');
    cy.intercept('PUT', '**/api/sales/sale-1', (req) => {
      expect(req.body.items).to.have.length(1);
      expect(req.body.items[0]).to.include({ productId: 'product-1', quantity: 2 });
      expect(req.body.date).to.be.a('string').and.not.be.empty;
      req.reply({ statusCode: 200, body: { id: 'sale-1' } });
    }).as('updateSale');

    cy.get('#sales-body button[data-edit-id="sale-1"]').click();
    cy.wait('@saleDetail');
    cy.get('#edit-sale-modal').should('have.class', 'is-active');
    cy.get('#edit-items-body tr').should('have.length', 1);
    cy.get('#edit-form').submit();
    cy.wait('@updateSale');
    cy.get('#sales-message').should('contain', 'Venda atualizada');
    cy.get('#edit-sale-modal').should('not.have.class', 'is-active');
  });

  it('fecha o modal de edicao sem salvar', () => {
    cy.intercept('GET', '**/api/sales/sale-1', saleDetail).as('saleDetail');
    cy.get('#sales-body button[data-edit-id="sale-1"]').click();
    cy.wait('@saleDetail');
    cy.get('#edit-sale-modal').should('have.class', 'is-active');
    cy.get('#edit-sale-close-btn').click();
    cy.get('#edit-sale-modal').should('not.have.class', 'is-active');
  });

  it('fecha o modal de detalhes', () => {
    cy.intercept('GET', '**/api/sales/sale-1', saleDetail).as('saleDetail');
    cy.get('#sales-body button[data-view-id="sale-1"]').contains('Detalhes').click();
    cy.wait('@saleDetail');
    cy.get('#sale-details-modal').should('have.class', 'is-active');
    cy.get('#sale-details-close-btn').click();
    cy.get('#sale-details-modal').should('not.have.class', 'is-active');
  });

  it('filtra por valor minimo e limpa os filtros', () => {
    cy.get('#filter-total-min').clear().type('120');
    cy.get('#sales-body tr.sales-row').should('have.length', 1).and('contain', 'Outro Cliente');
    cy.get('#filter-clear').click();
    cy.get('#sales-body tr.sales-row').should('have.length', 2);
  });

  it('filtra por texto de busca', () => {
    cy.get('#search-input').clear().type('Outro');
    cy.get('#sales-body tr.sales-row').should('have.length', 1).and('contain', 'Outro Cliente');
    cy.get('#search-input').clear();
    cy.get('#sales-body tr.sales-row').should('have.length', 2);
  });

  it('exibe a paginacao da lista', () => {
    cy.get('#page-info').should('not.be.empty');
    cy.get('#prev-page').should('exist');
    cy.get('#next-page').should('exist');
  });
});
