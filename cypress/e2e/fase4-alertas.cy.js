// Fase 4: estoque minimo de produtos e queda de margem com preco sugerido (API real).
describe('SGVC - Fase 4: alertas de estoque e margem (API real)', () => {
  it('FASE4-E2E-001 | estoque minimo definido na edicao gera selo na lista e card no dashboard', () => {
    cy.createRealUser('f4est').then((dono) => {
      cy.loginReal(dono);
      const nome = `Produto F4 ${Date.now()}`;
      cy.apiReal('POST', '/api/products', { name: nome, price: 50, purchase_price: 20, stock: 10 }).then((res) => {
        const id = res.body.id;
        cy.visit(`/product-edit.html?id=${id}`);
        cy.get('[data-stock-field="stock"]', { timeout: 10000 }).clear().type('2');
        cy.get('[data-stock-field="min"]').clear().type('5');
        cy.get('#save-btn').should('not.be.disabled').click();
        cy.contains(/Produto atualizado/i, { timeout: 10000 }).should('exist');
        cy.apiReal('GET', `/api/products/${id}`).then((r) => {
          expect(r.body.stock).to.eq(2);
          expect(r.body.min_stock).to.eq(5);
        });

        cy.visit('/products.html');
        cy.contains('tr', nome, { timeout: 10000 }).find('.products-stock-low').should('contain', 'Estoque baixo');

        cy.visit('/dashboard.html');
        cy.get('#alert-product-stock-list', { timeout: 10000 }).should('contain', nome);
        cy.get('#alert-product-stock-count').should('contain', '1');
      });
    });
  });

  it('FASE4-E2E-002 | queda de margem mostra preco sugerido e "Aplicar preco" atualiza o produto', () => {
    cy.createRealUser('f4mar').then((dono) => {
      cy.loginReal(dono);
      const nome = `Margem F4 ${Date.now()}`;
      cy.apiReal('POST', '/api/products', { name: nome, price: 100, purchase_price: 40, stock: 5 }).then((res) => {
        const id = res.body.id;
        // Custo sobe sem mudar o preco: margem cai de 60% para 20%.
        cy.apiReal('PUT', `/api/products/${id}`, { purchase_price: 80 }).its('status').should('eq', 200);
        cy.visit('/dashboard.html');
        cy.get('#alert-pricing-list', { timeout: 10000 }).should('contain', nome).and('contain', 'Preço sugerido');
        cy.get('#alert-pricing-list .alert-apply').first().click();
        cy.get('#alert-pricing-list', { timeout: 10000 }).should('not.contain', nome);
        cy.apiReal('GET', `/api/products/${id}`).its('body.price').should('be.gt', 100);
      });
    });
  });
});
