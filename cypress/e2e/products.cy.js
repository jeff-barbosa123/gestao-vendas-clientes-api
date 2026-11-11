describe('SGVC - Gerenciamento de Produtos', () => {
  beforeEach(() => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
  });

  it('carrega lista de produtos', () => {
    cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' }).as('productsList');
    cy.visit('/products.html');
    cy.wait('@productsList');
    cy.get('#products-body').should('exist');
  });

  it('abre formulario de criacao de produto', () => {
    cy.intercept('GET', '**/api/products', { body: [] }).as('emptyProducts');
    cy.visit('/products.html');
    cy.wait('@emptyProducts');
    cy.get('#create-product-btn, #add-product-btn').should('exist').click();
    cy.get('#product-form, #create-product-form').should('be.visible');
  });

  it('valida campos obrigatorios ao criar produto', () => {
    cy.intercept('GET', '**/api/products', { body: [] }).as('emptyProducts');
    cy.visit('/products.html');
    cy.wait('@emptyProducts');
    cy.get('#create-product-btn, #add-product-btn').click();
    cy.get('#product-submit, #create-submit').click();
    
    // Verificar erros de validação
    cy.get('.help.is-danger').should('have.length.at.least', 1);
  });

  it('cria produto com sucesso', () => {
    cy.intercept('GET', '**/api/products', { body: [] }).as('emptyProducts');
    cy.intercept('POST', '**/api/products', {
      statusCode: 201,
      body: { id: 'product-1', name: 'Produto Teste', price: 29.99 },
    }).as('createProduct');

    cy.visit('/products.html');
    cy.wait('@emptyProducts');
    cy.get('#create-product-btn, #add-product-btn').click();
    
    cy.get('#product-name, #create-name').type('Produto Teste');
    cy.get('#product-price, #create-price').type('29.99');
    cy.get('#product-submit, #create-submit').click();
    
    cy.wait('@createProduct');
    cy.get('.notification.is-success, #products-message').should('be.visible').and('contain', 'sucesso');
  });

  it('edita produto existente', () => {
    cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' }).as('productsList');
    cy.intercept('PUT', '**/api/products/**', {
      statusCode: 200,
      body: { id: 'product-1', name: 'Produto Editado', price: 39.99 },
    }).as('updateProduct');

    cy.visit('/products.html');
    cy.wait('@productsList');
    
    cy.get('#products-body tr').first().find('button[aria-label*="editar"], .edit-btn').click();
    cy.get('#product-name, #edit-name').clear().type('Produto Editado');
    cy.get('#product-price, #edit-price').clear().type('39.99');
    cy.get('#product-submit, #save-btn').click();
    
    cy.wait('@updateProduct');
    cy.get('.notification.is-success, #products-message').should('be.visible');
  });

  it('exclui produto com confirmacao', () => {
    cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' }).as('productsList');
    cy.intercept('DELETE', '**/api/products/**', { statusCode: 200 }).as('deleteProduct');

    cy.visit('/products.html');
    cy.wait('@productsList');
    
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });
    
    cy.get('#products-body tr').first().find('button[aria-label*="excluir"], .delete-btn').click();
    cy.wait('@deleteProduct');
    cy.get('.notification.is-success, #products-message').should('be.visible');
  });

  it('valida preco negativo nao e aceito', () => {
    cy.intercept('GET', '**/api/products', { body: [] }).as('emptyProducts');
    cy.visit('/products.html');
    cy.wait('@emptyProducts');
    cy.get('#create-product-btn, #add-product-btn').click();
    
    cy.get('#product-price, #create-price').type('-10');
    cy.get('#product-price, #create-price').blur();
    cy.get('.help.is-danger').should('be.visible').and('contain', 'preço');
  });

  it('filtra produtos por nome', () => {
    cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' }).as('productsList');
    cy.visit('/products.html');
    cy.wait('@productsList');
    
    cy.get('#products-search, #filter-input').type('Teste');
    cy.get('#products-body tr').should('have.length.at.least', 1);
  });
});
