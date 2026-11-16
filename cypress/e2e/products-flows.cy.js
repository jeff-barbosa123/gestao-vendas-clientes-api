// Fluxos complementares da tela de produtos (baseline antes da modularizacao de products.js).
describe('SGVC - Produtos: fluxos complementares', () => {
  const manyProducts = Array.from({ length: 25 }, (_, i) => ({
    id: `p-${i + 1}`,
    name: `Produto ${String(i + 1).padStart(2, '0')}`,
    description: 'Item de teste',
    price: String(10 + i),
    purchase_price: '5.00',
    product_type: 'RESALE',
    stock: 5,
    status_produto: 'ATIVO',
  }));

  const visit = (products) => {
    if (products) cy.intercept('GET', '**/api/products', { body: products }).as('productsList');
    else cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' }).as('productsList');
    cy.intercept('GET', '**/api/recipes*', { body: [] }).as('recipesList');
    cy.seedSession();
    cy.visit('/products.html');
    cy.wait('@productsList');
  };

  it('pagina a lista em paginas de 10 itens', () => {
    visit(manyProducts);
    cy.get('#products-body .products-name-link').should('have.length', 10);
    cy.get('#page-info').should('not.be.empty');
  });

  it('filtra por preco minimo e limpa os filtros', () => {
    visit();
    cy.get('#products-body .products-name-link').should('have.length', 3);
    cy.get('#filter-price-min').clear().type('40');
    cy.get('#products-body .products-name-link').should('have.length', 1).and('contain', 'Caf');
    cy.get('#filter-clear').click();
    cy.get('#filter-price-min').should('have.value', '');
    cy.get('#products-body .products-name-link').should('have.length', 3);
  });

  it('atualiza a lista pelo botao Atualizar', () => {
    visit();
    cy.get('#refresh-list').click();
    cy.wait('@productsList');
    cy.get('#products-body .products-name-link').should('have.length', 3);
    cy.get('#refresh-list').should('not.have.class', 'is-loading');
  });

  it('alterna entre produzido e revenda exibindo a secao de revenda', () => {
    visit();
    cy.get('#product-type-resale').check({ force: true });
    cy.get('#resale-section').should('be.visible');
    cy.get('#product-type-produced').check({ force: true });
    cy.get('#resale-section').should('not.be.visible');
  });

  it('calcula o preco de venda a partir da margem na revenda', () => {
    visit();
    cy.get('#product-type-resale').check({ force: true });
    cy.get('#create-purchase-price').type('10,00');
    cy.get('#resale-percent').clear().type('50');
    cy.get('#create-price').invoke('val').should('match', /\d/);
  });
});
