/**
 * Fluxo completo contra o backend REAL (sem stubs).
 * Precisa da API (porta 3000), da web (porta 4000) e do usuário do seed.
 * Credenciais: CYPRESS_E2E_EMAIL / CYPRESS_E2E_PASSWORD (padrão: admin do seed).
 *
 * Cobre o caminho do dia a dia: login → insumo → ficha técnica puxando o insumo →
 * produto de revenda → venda com forma de pagamento → painel e relatório.
 */
describe('SGVC - Fluxo Completo End-to-End (backend real)', () => {
  const email = Cypress.env('E2E_EMAIL') || 'admin@negocio.com';
  const password = Cypress.env('E2E_PASSWORD') || 'admin123';
  const tag = Date.now();
  const insumo = `Leite condensado E2E ${tag}`;
  const produto = `Refrigerante E2E ${tag}`;
  const cliente = `Cliente E2E ${tag}`;

  const apiLogin = () => {
    cy.request('POST', '/api/auth/login', { email, password }).its('status').should('eq', 200);
  };

  it('login pela tela leva ao painel', () => {
    cy.visit('/');
    cy.get('#email').type(email);
    cy.get('#password').type(password, { log: false });
    cy.get('#login-btn').click();
    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard.html');
    cy.get('#metric-customers').should('not.be.empty');
  });

  it('cadastra um insumo e a ficha técnica usa o preço dele', () => {
    apiLogin();
    cy.visit('/ingredients.html');
    cy.get('#ing-name').type(insumo);
    cy.get('#ing-qty').type('395');
    cy.get('#ing-unit').select('g');
    cy.get('#ing-cost').type('7,50');
    cy.get('#ing-save').click();
    cy.get('#ing-message').should('be.visible').and('contain', 'Insumo cadastrado');
    cy.get('#ing-tbody').should('contain', insumo);

    cy.visit('/recipes.html');
    cy.get('#ingredient-name').type(insumo).trigger('change');
    cy.get('#ingredient-pack').should('have.value', '395');
    cy.get('#ingredient-pack-unit').should('have.value', 'g');
    cy.get('#ingredient-cost').should('have.value', '7.50');
  });

  it('cadastra produto de revenda e vende no Pix', () => {
    apiLogin();
    cy.visit('/products.html');
    cy.get('#product-type-resale').check({ force: true });
    cy.get('#create-name').type(produto);
    cy.get('#create-purchase-price').type('3,00');
    cy.get('#create-price').type('6,00');
    cy.get('#create-submit').click();
    cy.get('#products-message').should('contain', 'Produto criado com sucesso');

    cy.visit('/sales.html');
    cy.get('#create-customer').type(cliente);
    cy.get('#create-payment').select('PIX');
    cy.contains('#item-product option', produto).then(($opt) => {
      cy.get('#item-product').select($opt.val());
    });
    cy.get('#item-qty').clear().type('2');
    cy.get('#add-item').click();
    cy.get('#sale-total').should('contain', '12,00');
    cy.get('#create-submit').click();
    cy.get('#sales-message').should('contain', 'Venda criada com sucesso');

    cy.request('/api/sales').then(({ body }) => {
      const list = Array.isArray(body) ? body : body.items || body.data || [];
      const sale = list.find((s) => (s.clienteNome || s.customerName) === cliente);
      expect(sale, 'venda criada').to.exist;
      expect(sale.paymentMethod).to.eq('PIX');
      expect(Number(sale.total)).to.eq(12);
    });
  });

  it('painel e relatório mostram margem e forma de pagamento', () => {
    apiLogin();
    cy.visit('/dashboard.html');
    cy.get('#alert-pricing-card').should('be.visible');
    cy.get('#alert-pricing-message').should('not.contain', 'Verificando');

    cy.visit('/reports.html');
    cy.get('#payment-body').should('contain', 'Pix');
  });
});
