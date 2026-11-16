// Tela de edicao de produto (baseline antes da modularizacao de product-edit.js).
describe('SGVC - Edicao de produto', () => {
  const product = {
    id: 'product-9',
    name: 'Refrigerante Lata',
    description: 'Lata 350ml',
    price: '6.00',
    purchase_price: '3.00',
    product_type: 'RESALE',
    status_produto: 'ATIVO',
  };

  const open = () => {
    cy.seedSession();
    cy.intercept('GET', '**/api/recipes*', { body: [] }).as('recipes');
    cy.intercept('GET', '**/api/products/product-9/ficha-tecnica', { statusCode: 404, body: { message: 'not found' } });
    cy.intercept('GET', '**/api/products/product-9', product).as('loadProduct');
    cy.visit('/product-edit.html?id=product-9');
    cy.wait('@loadProduct');
    cy.get('#edit-name').should('have.value', product.name);
  };

  it('carrega o produto de revenda nos campos', () => {
    open();
    cy.get('#edit-description').should('have.value', product.description);
    cy.get('#edit-status').should('have.value', 'ATIVO');
    cy.get('#edit-product-type-resale').should('be.checked');
  });

  it('botao Salvar so habilita apos alterar um campo', () => {
    open();
    cy.get('#save-btn').should('be.disabled');
    cy.get('#edit-name').type(' Zero');
    cy.get('#save-btn').should('not.be.disabled');
  });

  it('salva enviando PUT com o payload atualizado', () => {
    open();
    cy.intercept('PUT', '**/api/products/product-9', (req) => {
      expect(req.body).to.include({ name: 'Refrigerante Lata Zero', productType: 'resale', status: 'ATIVO' });
      expect(req.body.price).to.eq(6);
      expect(req.body.purchase_price).to.eq(3);
      req.reply({ statusCode: 200, body: { id: 'product-9' } });
    }).as('updateProduct');
    cy.get('#edit-name').type(' Zero');
    cy.get('#edit-purchase-price').clear().type('3,00');
    cy.get('#edit-price').clear().type('6,00');
    cy.get('#save-btn').click();
    cy.wait('@updateProduct');
    cy.get('#edit-message').should('contain', 'Produto atualizado');
  });

  it('nome curto mostra erro e nao envia', () => {
    open();
    cy.intercept('PUT', '**/api/products/product-9', cy.spy().as('updateSpy'));
    cy.get('#edit-name').clear().type('ab');
    cy.get('#edit-form').submit();
    cy.get('#edit-name-error').should('contain', 'Nome deve ter 3 a 120 caracteres');
    cy.get('@updateSpy').should('not.have.been.called');
  });

  it('produto produzido sem ficha tecnica vinculada nao e enviado', () => {
    open();
    cy.intercept('PUT', '**/api/products/product-9', cy.spy().as('updateSpy'));
    cy.get('#edit-product-type-produced').check({ force: true });
    cy.get('#edit-form').submit();
    cy.get('#edit-recipe-error').should('be.visible').and('contain', 'ficha');
    cy.get('@updateSpy').should('not.have.been.called');
  });

  it('modal de exclusao abre, fecha com cancelar e com ESC', () => {
    open();
    cy.get('#delete-btn').click();
    cy.get('#delete-modal').should('have.class', 'is-active');
    cy.get('#delete-cancel').click();
    cy.get('#delete-modal').should('not.have.class', 'is-active');
    cy.get('#delete-btn').click();
    cy.get('#delete-modal').should('have.class', 'is-active');
    cy.get('body').type('{esc}');
    cy.get('#delete-modal').should('not.have.class', 'is-active');
  });

  it('confirmar exclusao dispara um unico DELETE e mostra sucesso', () => {
    open();
    let deletes = 0;
    cy.intercept('DELETE', '**/api/products/product-9', (req) => {
      deletes += 1;
      req.reply({ statusCode: 200, body: { id: 'product-9' } });
    }).as('deleteProduct');
    cy.get('#delete-btn').click();
    cy.get('#delete-confirm').click();
    cy.wait('@deleteProduct');
    cy.get('#edit-message').should('contain', 'Produto removido com sucesso');
    cy.wait(400).then(() => expect(deletes).to.eq(1));
  });

  it('botao Voltar leva para a lista de produtos', () => {
    open();
    cy.get('#back-list').click();
    cy.location('pathname').should('eq', '/products.html');
  });

  it('sem id na URL redireciona para a lista', () => {
    cy.seedSession();
    cy.intercept('GET', '**/api/**', { body: [] });
    cy.visit('/product-edit.html');
    cy.location('pathname').should('eq', '/products.html');
  });
});
