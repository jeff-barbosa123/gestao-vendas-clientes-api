// Menu na tela Aparencia, acentos da tela offline e confirmacao antes de acoes que mudam produtos.
// Todas as respostas da API sao simuladas.
describe('SGVC - Interface e seguranca operacional', () => {
  const recipe = { id: 'r1', name: 'Receita do Bolo', yield: 10, yieldType: 'UN', costPerUnit: 1.5, status: 'ACTIVE' };
  const linked = { id: 'p1', name: 'Bolo Vinculado', price: '20.00', purchase_price: '5.00', product_type: 'PRODUCED', fichaTecnicaId: 'r1', status_produto: 'ATIVO' };
  const unlinked = { id: 'p2', name: 'Refrigerante', price: '6.00', purchase_price: '3.00', product_type: 'RESALE', status_produto: 'ATIVO' };

  // Substitui window.confirm; comeca respondendo "Cancelar".
  const stubConfirm = () => cy.window().then((win) => { cy.stub(win, 'confirm').as('confirm').returns(false); });
  const answerOk = () => cy.get('@confirm').then((stub) => { stub.resetHistory(); stub.returns(true); });
  const expectMessage = (...parts) =>
    cy.get('@confirm').should('have.been.calledOnce').then((stub) => {
      parts.forEach((p) => expect(stub.firstCall.args[0]).to.contain(p));
    });
  const UNLINK_TEXT = ['"Bolo Vinculado"', '"Receita do Bolo"', 'passa a ser de revenda', 'A ficha não será excluída'];

  describe('Aparencia', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/**', { body: [] });
      cy.stubAuthenticated();
      cy.intercept({ method: 'GET', pathname: '/api/branding' }, { body: { companyName: null, primaryColor: '#4f46e5', backgroundColor: '#0b1220', textColor: '#f1f5f9', hasLogo: false, logoUrl: null, isDefault: true } });
    });

    it('computador: mostra o menu lateral com a pagina atual destacada e navega', () => {
      cy.viewport(1280, 720);
      cy.visit('/appearance.html');
      cy.get('.app-nav').should('be.visible').and('have.css', 'position', 'fixed');
      cy.get('.app-nav a.is-active').should('have.length', 1).and('have.attr', 'href', '/appearance.html');
      cy.get('main').should(($m) => expect($m[0].getBoundingClientRect().left).to.be.at.least(230));
      cy.get('.app-nav a[href="/dashboard.html"]').not('.app-nav-brand').click();
      cy.location('pathname').should('eq', '/dashboard.html');
    });

    it('celular: o botao Menu abre a navegacao', () => {
      cy.viewport(375, 667);
      cy.visit('/appearance.html');
      cy.get('#app-nav-links').should('not.be.visible');
      cy.get('.app-nav-toggle').should('be.visible').click();
      cy.get('#app-nav-links').should('be.visible');
      cy.get('.app-nav a[href="/appearance.html"]').should('have.attr', 'aria-current', 'page');
    });
  });

  describe('Tela sem conexao', () => {
    it('exibe os acentos corretos', () => {
      cy.visit('/offline.html');
      cy.title().should('eq', 'SGVC | Sem conexão');
      cy.get('h1').should('have.text', 'Sem conexão');
      cy.get('main p').should('contain', 'Não foi possível falar com o SGVC.');
      cy.get('html').invoke('html').should('not.match', /Ã|Â|�/);
    });

    it('o service worker usa a nova versao do cache', () => {
      cy.request('/sw.js').its('body').should('contain', "const VERSION = 'sgvc-v4';");
    });
  });

  describe('Vinculos', () => {
    let calls;
    beforeEach(() => {
      calls = [];
      cy.intercept('GET', '**/api/**', { body: [] });
      cy.seedSession();
      cy.intercept({ method: 'GET', pathname: '/api/products' }, { body: [linked, unlinked] }).as('products');
      cy.intercept({ method: 'GET', pathname: '/api/recipes' }, { body: [recipe] });
      cy.intercept('DELETE', '**/api/products/*/remover-ficha', (req) => {
        calls.push(req.url);
        req.reply({ statusCode: 200, body: {} });
      }).as('unlink');
      cy.visit('/vinculos.html');
      cy.wait('@products');
      cy.get('button[data-unlink-id="p1"]').should('exist');
      stubConfirm();
    });

    const BUTTONS = [
      ['botao da tabela', () => cy.get('button[data-unlink-id="p1"]').click()],
      ['botao do formulario', () => { cy.get('#link-product').select('p1'); cy.get('#unlink-btn').click(); }],
    ];

    BUTTONS.forEach(([title, press]) => {
      it(`${title}: cancelar nao remove`, () => {
        press();
        expectMessage(...UNLINK_TEXT);
        cy.wait(500);
        cy.then(() => expect(calls).to.have.length(0));
      });

      it(`${title}: confirmar remove uma unica vez`, () => {
        answerOk();
        press();
        expectMessage(...UNLINK_TEXT);
        cy.wait('@unlink').its('request.url').should('contain', '/api/products/p1/remover-ficha');
        cy.get('#links-message').should('contain', 'Vínculo removido');
        cy.then(() => expect(calls).to.have.length(1));
      });
    });

    it('produto sem ficha: so avisa, sem perguntar nem chamar a API', () => {
      answerOk();
      cy.get('#link-product').select('p2');
      cy.get('#unlink-btn').click();
      cy.contains('Este produto não tem ficha vinculada.').should('be.visible');
      cy.wait(500);
      cy.get('@confirm').should('not.have.been.called');
      cy.then(() => expect(calls).to.have.length(0));
    });
  });

  describe('Edicao do produto', () => {
    let calls;
    beforeEach(() => {
      calls = [];
      cy.intercept('GET', '**/api/**', { body: [] });
      cy.seedSession();
      cy.intercept({ method: 'GET', pathname: '/api/recipes' }, { body: [recipe] });
      cy.intercept({ method: 'GET', pathname: '/api/products/p1' }, { body: linked }).as('loadProduct');
      cy.intercept({ method: 'GET', pathname: '/api/products/p1/ficha-tecnica' }, { body: recipe }).as('loadRecipe');
      cy.intercept('DELETE', '**/api/products/p1/remover-ficha', (req) => {
        calls.push(req.url);
        req.reply({ statusCode: 200, body: {} });
      }).as('unlink');
      cy.visit('/product-edit.html?id=p1');
      cy.wait(['@loadProduct', '@loadRecipe']);
      cy.get('#edit-name').should('have.value', linked.name);
      stubConfirm();
    });

    it('cancelar nao remove o vinculo', () => {
      cy.get('#edit-unlink-recipe-btn').click();
      expectMessage(...UNLINK_TEXT);
      cy.wait(500);
      cy.get('#edit-unlink-recipe-btn').should('not.be.disabled');
      cy.get('#edit-product-type-produced').should('be.checked');
      cy.then(() => expect(calls).to.have.length(0));
    });

    it('confirmar remove uma unica vez', () => {
      answerOk();
      cy.get('#edit-unlink-recipe-btn').click();
      expectMessage(...UNLINK_TEXT);
      cy.wait('@unlink');
      cy.get('#edit-message').should('contain', 'Vínculo removido');
      cy.get('#edit-product-type-resale').should('be.checked');
      cy.then(() => expect(calls).to.have.length(1));
    });
  });

  describe('Aplicar preco no dashboard', () => {
    let bodies;
    beforeEach(() => {
      bodies = [];
      cy.intercept('GET', '**/api/**', { body: [] });
      cy.seedSession();
      cy.fixture('dashboard-overview.json').then((overview) => {
        cy.intercept('GET', '**/api/analytics/overview*', {
          body: { ...overview, pricingAlerts: [{ productId: 'p1', name: 'Bolo Vinculado', price: 100, suggestedPrice: 133.33, margin: -0.1, level: 'below_cost' }] },
        });
      });
      cy.intercept('PUT', '**/api/products/p1', (req) => {
        bodies.push(req.body);
        req.reply({ statusCode: 200, body: {} });
      }).as('applyPrice');
      cy.visit('/dashboard.html');
      cy.get('#alert-pricing-list .alert-apply', { timeout: 10000 }).should('have.length', 1);
      stubConfirm();
    });

    it('cancelar nao altera o preco', () => {
      cy.get('#alert-pricing-list .alert-apply').click();
      cy.get('@confirm').should('have.been.calledOnce').then((stub) => {
        expect(stub.firstCall.args[0]).to.match(/"Bolo Vinculado" de R\$\s100,00 para R\$\s133,33\?/);
      });
      cy.wait(500);
      cy.get('#alert-pricing-list .alert-apply').should('not.be.disabled');
      cy.then(() => expect(bodies).to.have.length(0));
    });

    it('confirmar envia o novo preco uma unica vez', () => {
      answerOk();
      cy.get('#alert-pricing-list .alert-apply').click();
      cy.wait('@applyPrice').its('request.body').should('deep.equal', { price: 133.33 });
      cy.wait(500);
      cy.then(() => expect(bodies).to.have.length(1));
    });
  });
});
