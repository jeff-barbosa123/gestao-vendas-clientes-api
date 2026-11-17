// Nome com letras fora do Latin-1 (ex.: "Łódź"): a criacao em /products.html aceita; a edicao tambem deve aceitar.
describe('SGVC - Edicao de produto: nome com letras Unicode', () => {
  const product = {
    id: 'product-9',
    name: 'Bolo Łódź',
    description: 'Lata 350ml',
    price: '6.00',
    purchase_price: '3.00',
    product_type: 'RESALE',
    status_produto: 'ATIVO',
  };

  beforeEach(() => {
    cy.seedSession();
    cy.intercept('GET', '**/api/recipes*', { body: [] });
    cy.intercept('GET', '**/api/products/product-9/ficha-tecnica', { statusCode: 404, body: { message: 'not found' } });
    cy.intercept('GET', '**/api/products/product-9', product).as('loadProduct');
    cy.visit('/product-edit.html?id=product-9');
    cy.wait('@loadProduct');
    cy.get('#edit-name').should('have.value', product.name);
  });

  it('salva produto cujo nome tem letras fora do Latin-1', () => {
    cy.intercept('PUT', '**/api/products/product-9', (req) => {
      expect(req.body.name).to.contain('Łódź');
      req.reply({ statusCode: 200, body: { id: 'product-9' } });
    }).as('updateProduct');
    cy.get('#edit-description').clear().type('Descricao nova');
    cy.get('#edit-form').submit();
    cy.get('#edit-name-error').should('not.be.visible');
    cy.wait('@updateProduct');
    cy.get('#edit-message').should('contain', 'Produto atualizado');
  });
});
