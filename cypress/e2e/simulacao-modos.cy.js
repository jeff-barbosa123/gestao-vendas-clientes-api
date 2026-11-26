// Simulacao: dois modos (ficha tecnica x rapida) em abas, sem perder os seletores existentes.
describe('SGVC - Simulacao em modos', () => {
  const visitSim = (recipes) => {
    cy.stubAuthenticated();
    cy.intercept('GET', '**/api/recipes*', { statusCode: 200, body: recipes }).as('recipes');
    cy.visit('/simulacao.html');
    cy.wait('@recipes');
  };

  it('SIM-001 | com fichas: abre em "Usar ficha tecnica" e a rapida fica oculta', () => {
    visitSim([{ id: 1, name: 'Brigadeiro', yield: 10 }]);
    cy.get('#tab-recipe').should('have.attr', 'aria-selected', 'true');
    cy.get('#mode-recipe').should('be.visible');
    cy.get('#mode-quick').should('not.be.visible');
    cy.get('#by-id-form').should('be.visible');
  });

  it('SIM-002 | alterna para Simulacao rapida por clique e teclado, mantendo os ids', () => {
    visitSim([{ id: 1, name: 'Brigadeiro', yield: 10 }]);
    cy.get('#tab-quick').click();
    cy.get('#tab-quick').should('have.attr', 'aria-selected', 'true');
    cy.get('#mode-quick').should('be.visible').and('contain', 'não serão salvos');
    cy.get('#quick-yield').should('be.visible');
    cy.get('#mode-recipe').should('not.be.visible');
    cy.get('#tab-quick').type('{leftarrow}');
    cy.get('#tab-recipe').should('have.attr', 'aria-selected', 'true');
    cy.get('#recipe-id').should('be.visible');
  });

  it('SIM-003 | sem fichas: abre direto na Simulacao rapida', () => {
    visitSim([]);
    cy.get('#tab-quick').should('have.attr', 'aria-selected', 'true');
    cy.get('#mode-quick').should('be.visible');
    cy.get('#quick-submit').should('be.visible');
  });

  // ---------- Entrega: cobrado x gasto, por pedido ----------
  // Espacos nao separaveis do formato de moeda viram espacos comuns.
  const reads = (selector, expected) =>
    cy.get(selector).should(($el) => expect($el.text().replace(/\s+/g, ' ').trim()).to.equal(expected));
  const product = () => {
    reads('#result-price', 'R$ 2,00');
    reads('#result-ideal-price', 'R$ 2,00');
    reads('#result-profit', 'R$ 1,00');
    reads('#result-profit-detail', 'R$ 1,00');
  };
  const delivery = (charged, cost, balance, note) => {
    reads('#result-delivery-charged', charged);
    reads('#result-delivery-cost', cost);
    reads('#result-delivery-balance', balance);
    reads('#result-delivery-note', note);
  };
  // Mesmo exemplo do Mocha (API-SIM-010C): custo 12, rende 12, acrescimo 100%.
  const fillQuick = () => {
    visitSim([]);
    cy.get('#quick-yield').type('12');
    cy.get('#quick-margin').type('100');
    cy.get('#ingredient-name').type('Base');
    cy.get('#ingredient-qty').type('1');
    cy.get('#ingredient-cost').type('12');
    cy.get('#add-ingredient').click();
  };

  [
    ['saldo positivo', '8', '5', ['R$ 8,00', 'R$ 5,00', 'R$ 3,00', 'Sobram R$ 3,00 por pedido na entrega.']],
    ['saldo zero', '5', '5', ['R$ 5,00', 'R$ 5,00', 'R$ 0,00', 'A cobrança cobre exatamente o gasto.']],
    ['entrega gratis', '0', '5', ['R$ 0,00', 'R$ 5,00', '-R$ 5,00', 'Faltam R$ 5,00 por pedido para cobrir a entrega.']],
    ['sem entrega', '', '', ['R$ 0,00', 'R$ 0,00', 'R$ 0,00', 'Nenhum valor de entrega informado.']],
  ].forEach(([label, charged, cost, expected]) => {
    it(`SIM-004 | rapida, ${label}: produto continua R$ 2,00 com R$ 1,00 de lucro por unidade`, () => {
      fillQuick();
      if (charged) cy.get('#quick-fee').type(charged);
      if (cost) cy.get('#quick-delivery-cost').type(cost);
      cy.get('#quick-submit').click();
      product();
      delivery(...expected);
    });
  });

  it('SIM-005 | rapida: valor invalido ou negativo mostra erro no campo e nao calcula', () => {
    fillQuick();
    product();
    ['quick-fee', 'quick-delivery-cost'].forEach((id) => {
      ['-5', 'abc'].forEach((bad) => {
        cy.get(`#${id}`).clear().type(bad);
        cy.get(`#${id}-error`).should('be.visible').and('have.text', 'Informe um valor válido, igual ou maior que zero.');
        reads('#result-price', 'R$ --');
        reads('#result-delivery-balance', 'R$ --');
        cy.get(`#${id}`).clear();
        cy.get(`#${id}-error`).should('not.be.visible');
        product();
      });
    });
  });

  const openByRecipe = () => {
    visitSim([{ id: 'r1', name: 'Bolo' }]);
    cy.intercept('POST', '**/api/simulacao/preco', (req) => {
      const { taxaEntrega, custoEntrega } = req.body;
      req.reply({
        custo_total: 12, custo_por_unidade: 1, preco_minimo: 1, preco_ideal: 2, margem: 100,
        taxa_entrega: taxaEntrega, custo_entrega: custoEntrega, saldo_entrega: taxaEntrega - custoEntrega,
        preco_final_simulado: 2, lucro_estimado: 1,
      });
    }).as('simulate');
    cy.get('#recipe-id').select('r1');
    cy.get('#recipe-margin').type('100');
  };

  it('SIM-006 | com ficha: envia cobrado e gasto separados e mostra o saldo', () => {
    openByRecipe();
    cy.get('#recipe-fee').type('8,00');
    cy.get('#recipe-delivery-cost').type('5,00');
    cy.get('#by-id-submit').click();
    cy.wait('@simulate').its('request.body').should('deep.equal', { receitaId: 'r1', margem: 100, taxaEntrega: 8, custoEntrega: 5 });
    product();
    delivery('R$ 8,00', 'R$ 5,00', 'R$ 3,00', 'Sobram R$ 3,00 por pedido na entrega.');
  });

  it('SIM-007 | com ficha: campos vazios enviam zero', () => {
    openByRecipe();
    cy.get('#by-id-submit').click();
    cy.wait('@simulate').its('request.body').should('include', { taxaEntrega: 0, custoEntrega: 0 });
    delivery('R$ 0,00', 'R$ 0,00', 'R$ 0,00', 'Nenhum valor de entrega informado.');
  });

  it('SIM-008 | com ficha: valor invalido nao vira zero nem chama a API', () => {
    openByRecipe();
    cy.get('#recipe-fee').type('abc');
    cy.get('#recipe-delivery-cost').type('-5');
    cy.get('#by-id-submit').click();
    cy.get('#recipe-fee-error').should('be.visible');
    cy.get('#recipe-delivery-cost-error').should('be.visible');
    cy.get('#sim-message').should('contain', 'Revise os valores da entrega.');
    cy.get('@simulate.all').should('have.length', 0);
    reads('#result-delivery-balance', 'R$ --');
  });
});
