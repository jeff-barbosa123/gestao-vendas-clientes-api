/**
 * Encomendas contra o backend REAL, pela tela.
 * Nova encomenda → aparece na agenda e no painel → falta de insumo → pronta → entregue vira venda.
 */
describe('SGVC - Encomendas (backend real)', () => {
  let user;
  const tag = Date.now();
  const produto = `Bolo encomenda ${tag}`;
  const insumo = `Chocolate encomenda ${tag}`;
  const cliente = `Ana Encomenda ${tag}`;

  // Amanhã, ou hoje se amanhã já for a semana seguinte (a agenda e o aviso de faltas são da semana atual)
  const tomorrow = () => {
    const d = new Date();
    if (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  before(() => {
    cy.createRealUser('encomenda').then((u) => {
      user = u;
    });
    cy.then(() => cy.loginReal(user));
    // Produto com ficha: 1 bolo usa 200 g de chocolate; estoque de 300 g
    cy.apiReal('POST', '/api/ingredients', { name: insumo, packageQuantity: 1, packageUnit: 'kg', packageCost: 40 }).then(({ body: ing }) => {
      cy.apiReal('POST', `/api/ingredients/${ing.id}/stock/adjust`, { quantity: 300, unit: 'g' });
      cy.apiReal('POST', '/api/products', { name: produto, price: 80, purchase_price: 10, stock: 100 }).then(({ body: prod }) => {
        cy.apiReal('POST', '/api/recipes', {
          name: `Ficha ${produto}`,
          yield: 1,
          yieldType: 'UN',
          margin: 1.5,
          overhead: 0,
          labor: 0,
          linkProductId: prod.id,
          ingredients: [{ name: insumo, ingredientId: ing.id, quantity: 200, unit: 'g', packageQuantity: 1000, packUnit: 'g', cost: 40 }],
        });
      });
    });
  });

  beforeEach(() => cy.loginReal(user));

  it('cria a encomenda pela tela e ela aparece na agenda', () => {
    cy.visit('/orders.html');
    cy.get('.app-nav a.is-active').should('contain', 'Encomendas');
    cy.get('#ord-customer').type(cliente);
    cy.get('#ord-phone').type('(81) 98888-7777');
    cy.get('#ord-date').clear().type(tomorrow());
    cy.get('#ord-time').clear().type('23:30');
    cy.contains('#ord-item-product option', produto).then(($o) => cy.get('#ord-item-product').select($o.val()));
    cy.get('#ord-item-price').should('have.value', '80,00');
    cy.get('#ord-item-qty').type('2');
    cy.get('#ord-item-add').click();
    cy.get('#ord-items').should('contain', produto).and('contain', '160,00');
    cy.get('#ord-deposit').type('50');
    cy.get('#ord-deposit-method').select('PIX');
    cy.get('#ord-balance').should('contain', '110,00');
    cy.get('#ord-notes').type('Escrever Feliz Aniversário');
    cy.get('#ord-save').click();

    cy.get('#ord-message').should('contain', 'Encomenda salva');
    cy.contains('.ord-card', cliente).within(() => {
      cy.contains('23:30');
      cy.contains('A fazer');
      cy.contains('2 × ' + produto);
      cy.contains('Sinal');
      cy.contains('falta');
    });
    cy.get('.ord-wrapper').screenshot('encomendas-agenda', { overwrite: true });
  });

  it('avisa que falta insumo para a semana e mostra no painel', () => {
    cy.visit('/orders.html');
    // 2 bolos x 200 g = 400 g; estoque 300 g -> faltam 100 g
    cy.get('#ord-shortage').should('be.visible').and('contain', insumo).and('contain', 'faltam 100 g');
    cy.visit('/dashboard.html');
    cy.get('#alert-orders-list').should('contain', cliente);
  });

  it('marca pronta e entrega: vira venda com a forma de pagamento escolhida', () => {
    cy.visit('/orders.html');
    cy.contains('.ord-card', cliente).find('[data-action="READY"]').click();
    cy.contains('.ord-card', cliente).should('contain', 'Pronta');
    cy.contains('.ord-card', cliente).find('[data-action="DELIVER"]').click();
    cy.get('#ord-deliver-modal').should('be.visible');
    cy.get('#ord-deliver-summary').should('contain', 'sinal de R$').and('contain', '110,00');
    cy.get('#ord-deliver-method').select('CASH');
    cy.get('#ord-deliver-confirm').click();
    cy.get('#ord-message').should('contain', 'entregue e registrada como venda');
    cy.contains('.ord-card', cliente).should('not.exist'); // entregue sai da lista de abertas
    cy.get('#ord-show-closed').check();
    cy.contains('.ord-card', cliente).should('contain', 'Entregue');

    cy.request('/api/sales').then(({ body }) => {
      const list = Array.isArray(body) ? body : body.items || body.data || [];
      const sale = list.find((s) => (s.clienteNome || s.customerName) === cliente);
      expect(sale, 'venda criada na entrega').to.exist;
      expect(sale.paymentMethod).to.eq('CASH');
      expect(Number(sale.total)).to.eq(160);
    });
  });
});
