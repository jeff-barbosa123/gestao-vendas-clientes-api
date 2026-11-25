// Explicacoes curtas em Simulacao, Produtos, edicao e Vinculos, com exemplos conferidos contra o calculo das telas (API simulada).
describe('SGVC - Clareza nas telas de precos e vinculos', () => {
  const FICHA = 'A receita do produto: ingredientes, quantidades e custos.';
  const ACRESCIMO = 'O percentual é somado ao custo: R$ 10 + 40% = R$ 14. No painel, a margem é sobre a venda: R$ 4 de R$ 14 = 28,6%. Exemplo sem entrega.';
  const MARGEM_EX = 'Custo R$ 10 e margem de 40%: preço R$ 16,67.';
  const MARKUP_EX = 'Custo R$ 10 e markup de 40%: preço R$ 14.';
  const CUSTO_FICHA = 'Quanto custa produzir uma unidade, segundo a ficha.';
  const resale = { id: 'product-9', name: 'Refrigerante Lata', description: '', price: '6.00', purchase_price: '3.00', product_type: 'RESALE', status_produto: 'ATIVO' };

  // Espacos nao separaveis do formato de moeda viram espacos comuns.
  const plain = (text) => text.replace(/\s+/g, ' ').trim();
  const visible = (text) => cy.contains('.term-help:visible', text).scrollIntoView().should('be.visible');
  const reads = (selector, expected) => cy.get(selector).should(($el) => expect(plain($el.text())).to.equal(expected));
  const valueIs = (selector, expected) => cy.get(selector).should(($el) => expect(plain($el.val())).to.equal(expected));

  const openSimulation = () => {
    cy.intercept('GET', '**/api/recipes*', { body: [{ id: 'r1', name: 'Bolo', costPerUnit: 10, totalCost: 10 }] });
    cy.visit('/simulacao.html');
  };
  const openProducts = () => {
    cy.intercept({ method: 'GET', pathname: '/api/products' }, { body: [] });
    cy.intercept('GET', '**/api/recipes*', { body: [] });
    cy.visit('/products.html');
    cy.openProductForm();
  };
  const openEdit = () => {
    cy.intercept('GET', '**/api/recipes*', { body: [] });
    cy.intercept('GET', '**/api/products/product-9/ficha-tecnica', { statusCode: 404, body: {} }).as('linked');
    cy.intercept('GET', '**/api/products/product-9', resale).as('loadProduct');
    cy.visit('/product-edit.html?id=product-9');
    cy.wait(['@loadProduct', '@linked']);
  };
  const openLinks = () => {
    cy.intercept({ method: 'GET', pathname: '/api/products' }, { body: [] });
    cy.intercept({ method: 'GET', pathname: '/api/recipes' }, { body: [] });
    cy.visit('/vinculos.html');
  };
  const noSideScroll = () => cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth, 'sem rolagem lateral').to.be.at.most(doc.documentElement.clientWidth + 1);
  });

  beforeEach(() => {
    cy.stubAuthenticated();
  });

  [[1280, 800], [375, 812]].forEach(([width, height]) => {
    describe(`textos sempre visiveis em ${width}px`, () => {
      beforeEach(() => cy.viewport(width, height));

      it('Simulacao: ficha tecnica e acrescimo nos dois modos, sem "?" escondido', () => {
        openSimulation();
        cy.get('#tab-recipe').click();
        visible(FICHA);
        visible(ACRESCIMO);
        cy.get('#tab-quick').click();
        visible(ACRESCIMO);
        cy.get('.sim-wrapper .hint').should('not.exist');
        cy.contains('.result-label', 'Acréscimo sobre o custo').should('exist');
        cy.get('.result-label').should(($labels) => {
          expect([...$labels].map((el) => el.textContent.trim())).not.to.include('Margem');
        });
        cy.contains('.tip-title', 'Acréscimo ou margem?').should('exist');
        cy.get('#result-total-cost').siblings('.detail-note').should('not.contain', 'entrega');
        noSideScroll();
      });

      it('Produtos: ficha, custo unitario e exemplos de margem e markup', () => {
        openProducts();
        cy.get('#product-type-produced').check({ force: true });
        visible(FICHA);
        visible(CUSTO_FICHA);
        cy.get('#product-type-resale').check({ force: true });
        visible(MARGEM_EX);
        visible(MARKUP_EX);
        noSideScroll();
      });

      it('Edicao do produto: os mesmos textos', () => {
        openEdit();
        visible(MARGEM_EX);
        visible(MARKUP_EX);
        cy.get('#edit-product-type-produced').check({ force: true });
        visible(FICHA);
        visible(CUSTO_FICHA);
        noSideScroll();
      });

      it('Vinculos: ficha, vinculo, custo, preco sugerido e ficha incompleta', () => {
        openLinks();
        [
          FICHA,
          'Liga o produto à ficha para calcular o custo.',
          'Custo para produzir uma unidade.',
          'Preço calculado pela ficha.',
          'Falta rendimento, custo ou preço sugerido. Fichas inativas também precisam de revisão.',
        ].forEach(visible);
        noSideScroll();
      });
    });
  });

  describe('exemplos conferidos com o calculo das telas', () => {
    it('Simulacao rapida: custo 10 + 40% = R$ 14, que equivale a 28,6% sobre a venda', () => {
      openSimulation();
      cy.get('#tab-quick').click();
      cy.get('#quick-yield').type('1');
      cy.get('#quick-margin').type('40');
      cy.get('#ingredient-name').type('Base');
      cy.get('#ingredient-qty').type('1');
      cy.get('#ingredient-cost').type('10');
      cy.get('#add-ingredient').click();
      cy.get('#quick-submit').click();
      reads('#result-cost', 'R$ 10,00');
      reads('#result-price', 'R$ 14,00');
      reads('#result-profit', 'R$ 4,00');
      reads('#result-margin', '40,0%');
      reads('#margin-context', 'Acréscimo de 40,0% sobre o custo por unidade de R$ 10,00.');
      cy.get('#margin-health').should('contain', 'Acréscimo');
      expect((((14 - 10) / 14) * 100).toFixed(1)).to.equal('28.6');
    });

    it('Simulacao rapida com rendimento maior que 1: a frase usa o custo por unidade, nao o total', () => {
      openSimulation();
      cy.get('#tab-quick').click();
      cy.get('#quick-yield').type('2');
      cy.get('#quick-margin').type('40');
      cy.get('#ingredient-name').type('Base');
      cy.get('#ingredient-qty').type('1');
      cy.get('#ingredient-cost').type('20');
      cy.get('#add-ingredient').click();
      cy.get('#quick-submit').click();
      reads('#result-total-cost', 'R$ 20,00');
      reads('#margin-context', 'Acréscimo de 40,0% sobre o custo por unidade de R$ 10,00.');
    });

    [
      { name: 'cadastro', open: () => { openProducts(); cy.get('#product-type-resale').check({ force: true }); }, ids: { cost: '#create-purchase-price', percent: '#resale-percent', price: '#create-price', markup: '#resale-calc-markup' } },
      { name: 'edicao', open: openEdit, ids: { cost: '#edit-purchase-price', percent: '#edit-resale-percent', price: '#edit-price', markup: '#edit-resale-calc-markup' } },
    ].forEach(({ name, open, ids }) => {
      it(`${name}: margem de 40% da R$ 16,67 e markup de 40% da R$ 14`, () => {
        open();
        cy.get(ids.cost).clear().type('10,00').blur();
        cy.get(ids.percent).clear().type('40').blur();
        valueIs(ids.price, 'R$ 16,67');
        cy.get(ids.markup).check({ force: true });
        valueIs(ids.price, 'R$ 14,00');
      });
    });
  });

  it('painel mostra o rotulo curto "CMV" com a explicacao', () => {
    cy.visit('/dashboard.html', { onBeforeLoad: (win) => win.localStorage.setItem('sgvc.onboarding.dismissed', '1') });
    cy.get('#metric-cmv').siblings('.dashboard-label').should('have.text', 'CMV');
    cy.get('#metric-cmv').siblings('.term-help').should('be.visible').and('have.text', 'Quanto custaram os produtos que você vendeu.');
  });
});
