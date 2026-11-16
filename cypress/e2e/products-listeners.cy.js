// Garante que cada controle da listagem de produtos age uma unica vez por clique
// (antes, os listeners de ordenacao e paginacao estavam registrados em duplicidade e se anulavam/dobravam).
describe('SGVC - Produtos: listeners da listagem sem duplicidade', () => {
  const products = Array.from({ length: 25 }, (_, i) => ({
    id: `p-${i + 1}`,
    name: `Produto ${String(i + 1).padStart(2, '0')}`,
    description: 'Item de teste',
    price: String(10 + i),
    purchase_price: '5.00',
    product_type: 'RESALE',
    stock: 5,
    status_produto: 'ATIVO',
  }));

  beforeEach(() => {
    cy.intercept('GET', '**/api/products', { body: products }).as('productsList');
    cy.intercept('GET', '**/api/recipes*', { body: [] }).as('recipesList');
    cy.seedSession();
    cy.visit('/products.html');
    cy.wait('@productsList');
    cy.get('#products-body .products-name-link').first().should('contain', 'Produto 01');
  });

  it('o clique em Proxima avanca exatamente uma pagina', () => {
    cy.get('#next-page').click();
    cy.get('#products-body .products-name-link').first().should('contain', 'Produto 11');
    cy.get('#page-info').should('contain', '11-20');
  });

  it('o clique em Anterior volta exatamente uma pagina', () => {
    cy.get('#next-page').click();
    cy.get('#next-page').click();
    cy.get('#products-body .products-name-link').first().should('contain', 'Produto 21');
    cy.get('#prev-page').click();
    cy.get('#products-body .products-name-link').first().should('contain', 'Produto 11');
  });

  it('o cabecalho Nome alterna a ordenacao a cada clique', () => {
    cy.get('#name-header').click();
    cy.get('#products-body .products-name-link').first().should('contain', 'Produto 25');
    cy.get('#name-header').click();
    cy.get('#products-body .products-name-link').first().should('contain', 'Produto 01');
  });

  it('o cabecalho Preco ordena do maior para o menor no primeiro clique e alterna depois', () => {
    cy.get('#price-header').click();
    cy.get('#products-body .products-name-link').first().should('contain', 'Produto 25');
    cy.get('#price-header').click();
    cy.get('#products-body .products-name-link').first().should('contain', 'Produto 01');
  });
});
