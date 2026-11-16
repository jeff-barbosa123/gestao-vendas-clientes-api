// Produto de revenda nao tem ficha tecnica (a API responde 404 em /ficha-tecnica).
// Esse 404 nao pode limpar os campos de preco ao abrir a edicao.
describe('SGVC - Edicao de produto: precos da revenda preservados', () => {
  const product = {
    id: 'product-9',
    name: 'Refrigerante Lata',
    description: 'Lata 350ml',
    price: '6.00',
    purchase_price: '3.00',
    product_type: 'RESALE',
    status_produto: 'ATIVO',
  };

  beforeEach(() => {
    cy.seedSession();
    cy.intercept('GET', '**/api/recipes*', { body: [] });
    cy.intercept('GET', '**/api/products/product-9/ficha-tecnica', { statusCode: 404, body: { message: 'not found' } }).as('linked');
    cy.intercept('GET', '**/api/products/product-9', product).as('loadProduct');
    cy.visit('/product-edit.html?id=product-9');
    cy.wait(['@loadProduct', '@linked']);
  });

  it('mantem preco de compra e de venda preenchidos apos a carga', () => {
    cy.get('#edit-purchase-price').invoke('val').should('contain', '3,00');
    cy.get('#edit-price').invoke('val').should('contain', '6,00');
  });

  it('nao marca o formulario como alterado apos abrir', () => {
    cy.get('#edit-purchase-price').invoke('val').should('contain', '3,00');
    cy.get('#save-btn').should('be.disabled');
  });

  it('salva uma alteracao de nome sem reenviar os precos manualmente', () => {
    cy.intercept('PUT', '**/api/products/product-9', (req) => {
      expect(req.body.price).to.eq(6);
      expect(req.body.purchase_price).to.eq(3);
      expect(req.body.name).to.eq('Refrigerante Lata Zero');
      req.reply({ statusCode: 200, body: { id: 'product-9' } });
    }).as('updateProduct');
    cy.get('#edit-purchase-price').invoke('val').should('contain', '3,00');
    cy.get('#edit-name').type(' Zero');
    cy.get('#save-btn').click();
    cy.wait('@updateProduct');
    cy.get('#edit-message').should('contain', 'Produto atualizado');
  });
});
