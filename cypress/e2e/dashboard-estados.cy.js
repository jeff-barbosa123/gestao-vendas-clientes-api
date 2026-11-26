// Estados do painel: carregando, falha, zero confirmado, margem, comparacao e respostas antigas (API simulada).
describe('SGVC - Estados do painel', () => {
  const METRICS = ['customers', 'sales', 'revenue', 'cmv', 'profit', 'products', 'recipes', 'linked', 'margin'];
  const data = { customers: 14, salesCount: 48, revenueTotal: 18600, cmvTotal: 7000, profitTotal: 11600, products: 34, recipes: 18, linkedProducts: 12, margin: 0.32, pricingAlerts: [], stockAlerts: [], productStockAlerts: [] };
  const zero = { ...data, customers: 0, salesCount: 0, revenueTotal: 0, cmvTotal: 0, profitTotal: 0, products: 0, recipes: 0, linkedProducts: 0, margin: 0 };
  const SERVER_ERROR = { statusCode: 500, body: { success: false, message: 'Erro interno' } };
  const FORBIDDEN = { statusCode: 403, body: { success: false, message: 'Sem permissão' } };
  // Datas fixas: "hoje" e 25/11/2026.
  const MONTH = '2026-11-01..2026-11-30';
  const QUARTER = '2026-10-01..2026-12-31';
  const YEAR = '2026-01-01..2026-12-31';
  const PREVIOUS = { month: '2026-10-01..2026-10-31', quarter: '2026-07-01..2026-09-30', year: '2025-01-01..2025-12-31' };

  const rangeOf = (url) => {
    const params = new URL(url).searchParams;
    return `${params.get('start')}..${params.get('end')}`;
  };
  const ok = (body) => ({ statusCode: 200, body });

  // Segura uma resposta ate o teste liberar.
  const makeGate = () => {
    const gate = {};
    gate.promise = new Promise((resolve) => { gate.release = resolve; });
    return gate;
  };

  // reply(intervalo) devolve a resposta (ou uma promessa dela).
  const stubByRange = (pathname, reply) => {
    cy.intercept({ method: 'GET', pathname }, (req) => {
      const result = reply(rangeOf(req.url));
      if (result && typeof result.then === 'function') return result.then((value) => req.reply(value));
      return req.reply(result);
    });
  };
  const stubOverview = (reply = () => ok(data)) => stubByRange('/api/analytics/overview', reply);
  const stubFinancial = (reply) => stubByRange('/api/reports/financial', reply);
  const money = (revenue, salesCount = 3) => ok({ revenue, salesCount });

  const open = () => {
    cy.clock(new Date('2026-11-25T15:00:00Z').getTime(), ['Date']);
    cy.visit('/dashboard.html', { onBeforeLoad: (win) => win.localStorage.setItem('sgvc.onboarding.dismissed', '1') });
  };

  const value = (key, text) => cy.get(`#metric-${key}`).should('have.text', text);
  const note = (key, text) => cy.get(`[data-empty="${key}"]`).should('be.visible').and('have.text', text);
  const noNote = (key) => cy.get(`[data-empty="${key}"]`).should('not.be.visible');
  const revenueHint = (text) => cy.get('#alert-revenue-hint').should('have.text', text);
  const noSideScroll = () => cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1);
  });
  const allLoading = () => METRICS.forEach((key) => {
    value(key, '—');
    note(key, 'Carregando...');
  });

  beforeEach(() => {
    cy.stubAuthenticated();
  });

  describe('carregamento', () => {
    it('primeira carga mostra "—" e "Carregando..." nos 9 cartoes, sem zeros', () => {
      const gate = makeGate();
      stubOverview(() => gate.promise);
      open();
      allLoading();
      cy.get('[data-chart-section]').should('not.be.visible');
      cy.get('#alert-revenue-message').should('contain', 'Carregando análise financeira...');
      cy.then(() => gate.release(ok(data)));
      value('customers', '14');
      value('margin', '32,0%');
      METRICS.forEach(noNote);
    });

    it('trocar o periodo tira os numeros anteriores e limpa o cartao de faturamento', () => {
      const gate = makeGate();
      stubOverview((range) => (range === QUARTER ? gate.promise : ok(data)));
      stubFinancial((range) => money(range === MONTH ? 600 : 1000));
      open();
      value('customers', '14');
      cy.get('#alert-revenue-hint').should('contain', '-40,0%');
      cy.get('#dashboard-period').select('quarter');
      allLoading();
      cy.get('[data-chart-section]').should('not.be.visible');
      cy.get('#alert-revenue-message').should('contain', 'Carregando análise financeira...');
      revenueHint('');
      cy.get('#alert-revenue-count').should('have.text', '');
      cy.then(() => gate.release(ok({ ...data, customers: 15 })));
      value('customers', '15');
    });

    [
      ['sucesso', ok({ ...data, salesCount: 999, revenueTotal: 999 })],
      ['falha', SERVER_ERROR],
    ].forEach(([name, late]) => {
      it(`resposta antiga com ${name} nao sobrescreve o periodo escolhido depois`, () => {
        const gate = makeGate();
        const asked = { overview: [], financial: [] };
        stubOverview((range) => {
          asked.overview.push(range);
          if (range === QUARTER) return gate.promise;
          return ok(range === YEAR ? { ...data, salesCount: 500 } : data);
        });
        stubFinancial((range) => {
          asked.financial.push(range);
          return money(range === YEAR ? 5000 : 100);
        });
        open();
        value('sales', '48');
        cy.get('#dashboard-period').select('quarter');
        // So troca de novo depois que o pedido do trimestre ja saiu.
        cy.wrap(asked.overview).should('include', QUARTER);
        cy.get('#dashboard-period').select('year');
        value('sales', '500');
        cy.get('#alert-revenue-message').should('contain', '5.000,00');
        cy.then(() => gate.release(late));
        // Na falha, a carga antiga ainda passa pelo caminho alternativo.
        if (name === 'falha') cy.wrap(asked.financial).should('include', QUARTER);
        cy.wait(1500);
        value('sales', '500');
        cy.get('#alert-revenue-message').should('contain', '5.000,00');
        cy.get('#dashboard-message').should('not.be.visible');
      });
    });

    it('analise financeira e clientes atrasados de uma carga antiga tambem sao ignorados', () => {
      const financialGate = makeGate();
      const clientsGate = makeGate();
      let clientCalls = 0;
      stubOverview();
      stubFinancial((range) => (range === MONTH ? financialGate.promise : money(5000)));
      cy.intercept({ method: 'GET', pathname: '/api/customers' }, (req) => {
        clientCalls += 1;
        if (clientCalls === 1) return clientsGate.promise.then((reply) => req.reply(reply));
        return req.reply(ok([]));
      });
      open();
      value('customers', '14');
      cy.wrap(null).should(() => expect(clientCalls).to.equal(1));
      cy.get('#dashboard-period').select('year');
      cy.get('#alert-revenue-message').should('contain', '5.000,00');
      cy.get('#alert-clients-message').should('contain', 'Sem dados de clientes');
      cy.then(() => {
        financialGate.release(SERVER_ERROR);
        clientsGate.release(SERVER_ERROR);
      });
      cy.wait(1000);
      cy.get('#alert-revenue-message').should('contain', '5.000,00');
      cy.get('#alert-revenue-retry').should('not.be.visible');
      cy.get('#alert-clients-message').should('contain', 'Sem dados de clientes');
      cy.get('#dashboard-message').should('not.be.visible');
    });
  });

  describe('zeros e margem', () => {
    it('zeros confirmados tem frase propria; cadastros nao falam em periodo', () => {
      stubOverview(() => ok(zero));
      open();
      ['customers', 'sales', 'products', 'recipes', 'linked'].forEach((key) => value(key, '0'));
      ['revenue', 'cmv', 'profit'].forEach((key) => {
        cy.get(`#metric-${key}`).invoke('text').should('match', /^R\$\s0,00$/);
        note(key, 'Sem faturamento no período.');
      });
      note('customers', 'Nenhum cliente cadastrado.');
      note('sales', 'Nenhuma venda no período.');
      note('products', 'Nenhum produto cadastrado.');
      note('recipes', 'Nenhuma ficha técnica cadastrada.');
      note('linked', 'Nenhum produto vinculado.');
      value('margin', '—');
      note('margin', 'Sem faturamento no período para calcular a margem.');
      cy.get('.dashboard-period-note').should('contain', 'Os cadastros mostram o total atual.').and('not.contain', 'Todos os dados');
    });

    [
      ['zero (custo igual ao faturamento)', 0, '0,0%'],
      ['negativa', -0.25, '-25,0%'],
      ['positiva', 0.32, '32,0%'],
    ].forEach(([name, margin, text]) => {
      it(`com faturamento, margem ${name} aparece como resultado`, () => {
        stubOverview(() => ok({ ...data, margin }));
        open();
        value('margin', text);
        noNote('margin');
      });
    });

    it('caminho alternativo sem faturamento tambem nao inventa margem', () => {
      stubOverview(() => SERVER_ERROR);
      cy.intercept({ method: 'GET', pathname: '/api/reports/financial' }, { revenue: 0, cmv: 0, profit: 0, margin: 0, salesCount: 0 });
      cy.intercept({ method: 'GET', pathname: '/api/recipes' }, []);
      open();
      value('sales', '0');
      value('margin', '—');
      note('margin', 'Sem faturamento no período para calcular a margem.');
    });
  });

  describe('comparacao e falha da analise financeira', () => {
    [['month', 'mês', MONTH], ['quarter', 'trimestre', QUARTER], ['year', 'ano', YEAR]].forEach(([unit, label, current]) => {
      const select = () => {
        if (unit === 'month') cy.get('#dashboard-period').select('year');
        cy.get('#dashboard-period').select(unit);
      };

      it(`${label} anterior sem faturamento`, () => {
        stubOverview();
        stubFinancial((range) => money(range === current ? 600 : 0));
        open();
        select();
        revenueHint(`Sem faturamento no ${label} anterior para comparar.`);
      });

      it(`falha so ao carregar o ${label} anterior mantem o faturamento atual`, () => {
        stubOverview();
        stubFinancial((range) => (range === PREVIOUS[unit] ? SERVER_ERROR : money(600)));
        open();
        select();
        revenueHint(`Não foi possível carregar o ${label} anterior para comparar.`);
        cy.get('#alert-revenue-message').should('contain', '600,00').and('contain', 'Faturamento');
        cy.get('#alert-revenue-retry').should('not.be.visible');
        cy.get(`#alert-revenue-action`).should('be.visible');
      });
    });

    it('falha na analise atual oferece "Tentar novamente" no cartao e recupera sem recarregar', () => {
      let failing = true;
      stubOverview();
      stubFinancial((range) => (failing ? SERVER_ERROR : money(range === MONTH ? 600 : 1000)));
      open();
      cy.get('#alert-revenue-message').should('contain', 'Não foi possível carregar os dados financeiros');
      cy.get('#alert-revenue-retry').should('be.visible').and('not.be.disabled');
      cy.get('#alert-revenue-action').should('not.be.visible');
      revenueHint('');
      value('customers', '14');
      cy.window().then((win) => { win.__semRecarregar = true; });
      cy.then(() => { failing = false; });
      cy.get('#alert-revenue-retry').click();
      cy.get('#alert-revenue-message').should('contain', '600,00');
      cy.get('#alert-revenue-hint').should('contain', '-40,0%');
      cy.get('#alert-revenue-retry').should('not.be.visible');
      cy.get('#alert-revenue-action').should('be.visible');
      cy.window().its('__semRecarregar').should('eq', true);
    });

    it('sem permissao (403) mostra a mensagem sem botao de nova tentativa', () => {
      stubOverview();
      stubFinancial(() => FORBIDDEN);
      open();
      cy.get('#alert-revenue-message').should('contain', 'Não foi possível carregar os dados financeiros');
      cy.get('#alert-revenue-retry').should('not.be.visible');
      cy.location('pathname').should('eq', '/dashboard.html');
    });

    it('falha ao conferir o login explica o "—" e oferece nova tentativa no cartao', () => {
      cy.intercept({ method: 'GET', pathname: '/api/auth/me' }, SERVER_ERROR);
      open();
      METRICS.forEach((key) => {
        value(key, '—');
        note(key, 'Não foi possível carregar.');
      });
      cy.get('#alert-revenue-retry').should('be.visible');
    });
  });

  [[1280, 800], [375, 812]].forEach(([width, height]) => {
    it(`textos de carregamento e de zero sem rolagem lateral em ${width}px`, () => {
      const gate = makeGate();
      cy.viewport(width, height);
      stubOverview(() => gate.promise);
      open();
      allLoading();
      noSideScroll();
      cy.then(() => gate.release(ok(zero)));
      note('margin', 'Sem faturamento no período para calcular a margem.');
      noSideScroll();
    });
  });
});
