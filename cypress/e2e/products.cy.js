// Tela de produtos com a API simulada. Seletores seguem o layout atual de products.html.
describe('SGVC - Gerenciamento de Produtos', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' }).as('productsList');
    cy.intercept('GET', '**/api/recipes*', { body: [] }).as('recipesList');
    cy.seedSession();
    cy.visit('/products.html');
    cy.wait('@productsList');
  });

  it('carrega lista de produtos', () => {
    cy.get('#products-body').should('contain', 'Bolo de Chocolate').and('contain', 'Café Especial');
    cy.get('#products-body .products-name-link').should('have.length', 3);
  });

  it('filtra produtos por nome', () => {
    cy.get('#search-input').type('café');
    cy.get('#products-body .products-name-link').should('have.length', 1).and('contain', 'Café Especial');
    cy.get('#search-input').clear().type('xyz inexistente');
    cy.get('#products-body').should('contain', 'Nenhum produto encontrado');
  });

  it('valida nome obrigatorio ao criar produto', () => {
    cy.intercept('POST', '**/api/products', cy.spy().as('createSpy'));
    cy.get('#product-type-resale').check({ force: true });
    cy.get('#create-submit').click();
    cy.get('#create-name-error').should('be.visible');
    cy.get('@createSpy').should('not.have.been.called');
  });

  it('produto produzido sem ficha tecnica nao e enviado', () => {
    cy.intercept('POST', '**/api/products', cy.spy().as('createSpy'));
    cy.get('#product-type-produced').check({ force: true });
    cy.get('#create-name').type('Torta de Limão');
    cy.get('#create-submit').click();
    cy.get('#create-recipe-error').should('be.visible').and('contain', 'Selecione uma ficha técnica');
    cy.get('@createSpy').should('not.have.been.called');
  });

  it('cria produto de revenda com uma unica requisicao', () => {
    let posts = 0;
    cy.intercept('POST', '**/api/products', (req) => {
      posts += 1;
      expect(req.body).to.include({ name: 'Refrigerante Lata', productType: 'resale' });
      expect(req.body.purchase_price).to.eq(3);
      expect(req.body.price).to.eq(6);
      req.reply({ statusCode: 201, body: { id: 'product-9', ...req.body } });
    }).as('createProduct');

    cy.get('#product-type-resale').check({ force: true });
    cy.get('#create-name').type('Refrigerante Lata');
    cy.get('#create-purchase-price').type('3,00');
    cy.get('#create-price').type('6,00');
    cy.get('#create-submit').click();

    cy.wait('@createProduct');
    cy.get('#products-message').should('be.visible').and('contain', 'Produto criado com sucesso');
    cy.wait(500).then(() => expect(posts, 'requisições de criação').to.eq(1));
  });

  it('editar produto abre a pagina de edicao', () => {
    cy.get('#products-body button[data-edit-id="product-1"]').click();
    cy.location('pathname').should('eq', '/product-edit.html');
    cy.location('search').should('contain', 'id=product-1');
  });
});
