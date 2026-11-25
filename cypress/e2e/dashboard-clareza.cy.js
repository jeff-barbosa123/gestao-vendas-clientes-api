// Painel claro para quem tem pouca pratica: base vazia, falhas de carga e explicacoes dos termos (API simulada).
describe('SGVC - Dashboard claro', () => {
  const data = { customers: 14, salesCount: 48, revenueTotal: 18600, cmvTotal: 7000, profitTotal: 11600, products: 34, recipes: 18, linkedProducts: 12, margin: 0.32, pricingAlerts: [], stockAlerts: [], productStockAlerts: [] };
  const empty = { ...data, customers: 0, salesCount: 0, revenueTotal: 0, cmvTotal: 0, profitTotal: 0, products: 0, recipes: 0, linkedProducts: 0, margin: 0 };
  const METRICS = ['customers', 'sales', 'revenue', 'cmv', 'profit', 'products', 'recipes', 'linked', 'margin'];
  const SERVER_ERROR = { statusCode: 500, body: { success: false, message: 'Erro interno' } };
  const FORBIDDEN = { statusCode: 403, body: { success: false, message: 'Sem permissão' } };

  // O guia consulta o historico inteiro (sem datas); o painel consulta o periodo (com datas).
  const stubOverview = ({ history = data, period = data } = {}) => {
    cy.intercept('GET', '**/api/analytics/overview*', (req) => {
      const reply = req.url.includes('start=') ? period : history;
      req.reply(typeof reply === 'function' ? reply() : { statusCode: 200, body: reply });
    });
  };

  // Rota que pode falhar e depois voltar a funcionar.
  const stubSwitch = (pathname, failure, okBody) => {
    const route = { failing: true, calls: 0 };
    cy.intercept({ method: 'GET', pathname }, (req) => {
      route.calls += 1;
      if (route.failing) {
        if (failure === 'network') req.reply({ forceNetworkError: true });
        else req.reply(failure);
      } else req.reply({ statusCode: 200, body: typeof okBody === 'function' ? okBody() : okBody });
    });
    return route;
  };

  const open = ({ dismissed = false } = {}) => {
    cy.visit('/dashboard.html', {
      onBeforeLoad: (win) => {
        if (dismissed) win.localStorage.setItem('sgvc.onboarding.dismissed', '1');
        else win.localStorage.removeItem('sgvc.onboarding.dismissed');
        win.localStorage.removeItem('sgvc.onboarding.company');
      },
    });
  };

  const markPage = () => cy.window().then((win) => { win.__semRecarregar = true; });
  const assertSamePage = () => cy.window().its('__semRecarregar').should('eq', true);

  beforeEach(() => {
    cy.stubAuthenticated();
  });

  describe('base vazia e guia', () => {
    it('base vazia destaca o guia e recolhe indicadores e alertas, mantendo as acoes rapidas', () => {
      stubOverview({ history: empty, period: empty });
      open();
      cy.get('#onboarding-card').should('be.visible').and('have.class', 'is-highlight').and('contain', 'ainda não tem dados');
      cy.get('#metric-customers').should('not.be.visible');
      cy.get('#alert-clients-message').should('not.be.visible');
      cy.get('#quick-sale-action').should('be.visible');
      cy.get('#onboarding-show-metrics').should('have.attr', 'aria-expanded', 'false').and('have.text', 'Mostrar indicadores').click();
      cy.get('#onboarding-show-metrics').should('have.attr', 'aria-expanded', 'true');
      cy.get('#metric-customers').should('be.visible').and('have.text', '0');
      cy.get('#alert-clients-message').should('be.visible');
    });

    it('dispensar o guia devolve o painel normal', () => {
      stubOverview({ history: empty, period: empty });
      open();
      cy.get('#metric-customers').should('not.be.visible');
      cy.get('#onboarding-dismiss').click();
      cy.get('#onboarding-card').should('not.exist');
      cy.get('#metric-customers').should('be.visible');
    });

    it('guia ja dispensado: base vazia aparece normal', () => {
      stubOverview({ history: empty, period: empty });
      open({ dismissed: true });
      cy.get('#metric-customers').should('be.visible').and('have.text', '0');
      cy.get('#onboarding-card').should('not.exist');
    });

    it('periodo sem vendas, mas com historico, nao e base vazia e marca a primeira venda como feita', () => {
      stubOverview({ history: { ...empty, customers: 2, products: 1, salesCount: 5 }, period: empty });
      open();
      cy.get('#onboarding-card').should('not.have.class', 'is-highlight');
      cy.contains('.onboarding-item', 'primeira venda').should('have.class', 'is-done');
      cy.get('#metric-customers').should('be.visible');
      cy.get('#onboarding-show-metrics').should('not.exist');
    });

    ['customers', 'products', 'recipes', 'salesCount'].forEach((field) => {
      it(`existir ${field} ja deixa o painel normal`, () => {
        stubOverview({ history: { ...empty, [field]: 1 }, period: empty });
        open();
        cy.get('#onboarding-card').should('exist').and('not.have.class', 'is-highlight');
        cy.get('#metric-customers').should('be.visible');
      });
    });

    it('base vazia com falha em clientes nao esconde o erro', () => {
      stubOverview({ history: empty, period: empty });
      stubSwitch('/api/customers', SERVER_ERROR, []);
      open();
      cy.get('#onboarding-card').should('exist');
      cy.get('#alert-clients-retry').should('be.visible');
      cy.get('#alert-clients-message').should('be.visible').and('contain', 'Não foi possível carregar os clientes');
      cy.get('#onboarding-show-metrics').should('not.be.visible');
    });
  });

  describe('falhas de carga', () => {
    it('indicadores indisponiveis mostram "—", sem avisos tranquilizadores, e voltam com Tentar novamente', () => {
      let failing = true;
      stubOverview({ period: () => (failing ? SERVER_ERROR : { statusCode: 200, body: data }) });
      stubSwitch('/api/recipes', SERVER_ERROR, []);
      open({ dismissed: true });
      cy.get('#dashboard-message').should('be.visible').and('contain', 'Não foi possível carregar os indicadores');
      METRICS.forEach((key) => cy.get(`#metric-${key}`).should('have.text', '—'));
      cy.get('.kpi-empty:visible').should('not.exist');
      cy.get('#alert-pricing-message').should('contain', 'Não foi possível verificar').and('not.contain', 'mantêm a margem');
      cy.get('#alert-stock-message').should('contain', 'Não foi possível verificar');
      cy.get('#alert-product-stock-message').should('contain', 'Não foi possível verificar');
      markPage();
      cy.then(() => { failing = false; });
      cy.get('#dashboard-retry').click();
      cy.get('#metric-customers').should('have.text', '14');
      cy.get('#dashboard-message').should('not.be.visible');
      cy.get('#alert-pricing-message').should('contain', 'mantêm a margem');
      assertSamePage();
    });

    it('quando so o resumo falha, usa o caminho alternativo com CMV e lucro, sem afirmar que esta tudo certo', () => {
      stubOverview({ period: () => SERVER_ERROR });
      cy.intercept({ method: 'GET', pathname: '/api/reports/financial' }, { revenue: 100, cmv: 40, profit: 60, margin: 0.6, salesCount: 2 });
      cy.intercept({ method: 'GET', pathname: '/api/recipes' }, []);
      open({ dismissed: true });
      cy.get('#metric-sales').should('have.text', '2');
      cy.get('#metric-cmv').invoke('text').should('match', /40,00/);
      cy.get('#metric-profit').invoke('text').should('match', /60,00/);
      cy.get('#dashboard-message').should('not.be.visible');
      cy.get('#alert-pricing-message').should('contain', 'Não foi possível verificar');
    });

    [
      { name: 'clientes', path: '/api/customers', prefix: 'alert-clients', emptyText: 'Sem dados de clientes' },
      { name: 'produtos', path: '/api/products', prefix: 'alert-products', emptyText: 'Sem produtos cadastrados' },
    ].forEach(({ name, path, prefix, emptyText }) => {
      it(`falha em ${name} aparece como erro (nao como base vazia) e o botao do cartao recupera`, () => {
        stubOverview();
        const route = stubSwitch(path, SERVER_ERROR, []);
        open({ dismissed: true });
        cy.get(`#${prefix}-message`).should('contain', `Não foi possível carregar os ${name}`).and('not.contain', emptyText);
        cy.get(`#${prefix}-action`).should('not.be.visible');
        cy.get('#dashboard-message').should('contain', name);
        cy.get('#dashboard-retry').should('be.visible');
        cy.get('#metric-customers').should('have.text', '14');
        markPage();
        cy.then(() => { route.failing = false; });
        cy.get(`#${prefix}-retry`).click();
        cy.get(`#${prefix}-message`).should('contain', emptyText);
        cy.get(`#${prefix}-retry`).should('not.be.visible');
        cy.get(`#${prefix}-action`).should('be.visible');
        cy.get('#dashboard-message').should('not.be.visible');
        assertSamePage();
      });

      it(`sem permissao (403) em ${name} esconde so o cartao, sem sair do painel`, () => {
        stubOverview();
        stubSwitch(path, FORBIDDEN, []);
        open({ dismissed: true });
        cy.get('#metric-customers').should('have.text', '14');
        cy.get(`#${prefix}-message`).closest('.dashboard-alert-card').should('not.be.visible');
        cy.get('#alert-revenue-message').should('be.visible');
        cy.get('#dashboard-message').should('not.be.visible');
        cy.location('pathname').should('eq', '/dashboard.html');
      });
    });

    it('falha de conexao ao conferir o login nao vira "sessao expirada" e recupera sem recarregar', () => {
      stubOverview();
      const me = stubSwitch('/api/auth/me', 'network', { user: { id: 'u', email: 'a@b.com', name: 'Ana' } });
      open({ dismissed: true });
      cy.get('#dashboard-message').should('contain', 'conectar ao servidor').and('not.contain', 'xpirada');
      cy.get('#metric-customers').should('have.text', '—');
      cy.get('#alert-clients-message').should('contain', 'Não foi possível carregar os clientes');
      cy.get('#alert-orders-message').should('contain', 'Não foi possível');
      cy.location('pathname').should('eq', '/dashboard.html');
      markPage();
      cy.then(() => { me.failing = false; });
      cy.get('#dashboard-retry').click();
      cy.get('#metric-customers').should('have.text', '14');
      cy.get('#dashboard-user').should('have.text', 'Ana');
      cy.get('#dashboard-message').should('not.be.visible');
      assertSamePage();
    });

    it('sessao expirada (401) continua levando ao login', () => {
      cy.stubUnauthenticated();
      cy.visit('/dashboard.html');
      cy.location('pathname', { timeout: 10000 }).should('eq', '/');
    });

    it('401 na lista de clientes leva ao login', () => {
      stubOverview();
      let expired = false;
      cy.intercept('GET', '**/api/auth/me', (req) => {
        req.reply(expired ? { statusCode: 401, body: {} } : { statusCode: 200, body: { user: { id: 'u', email: 'a@b.com' } } });
      });
      cy.intercept({ method: 'GET', pathname: '/api/customers' }, (req) => {
        expired = true;
        req.reply({ statusCode: 401, body: {} });
      });
      open({ dismissed: true });
      cy.location('pathname', { timeout: 10000 }).should('eq', '/');
    });
  });

  describe('explicacoes sempre visiveis', () => {
    const CMV = 'Quanto custaram os produtos que você vendeu.';
    const MARGEM = 'Quanto sobra da venda após o custo do produto. 40% são R$ 40 a cada R$ 100, antes das outras despesas.';
    const FICHA = 'A receita do produto: ingredientes, quantidades e custos.';
    const register = { openedAt: '2026-11-25T12:00:00Z', openingAmount: 0, salesCount: 0, salesTotal: 0, expectedCash: 0, cmv: 0, profit: 0, payments: [] };
    const help = (text) => cy.contains('.term-help', text).scrollIntoView().should('be.visible');
    const stubPdv = (overrides = {}) => cy.intercept({ method: 'GET', pathname: '/api/pdv/session' }, { register: { ...register, ...overrides }, can: {} });

    [[1280, 800], [375, 812]].forEach(([width, height]) => {
      it(`dashboard, relatorios, DRE, PDV, fichas e CRM em ${width}px`, () => {
        cy.viewport(width, height);
        stubOverview();
        stubPdv();
        open({ dismissed: true });
        [CMV, MARGEM, FICHA].forEach(help);
        cy.visit('/reports.html');
        [CMV, MARGEM].forEach(help);
        cy.visit('/finance.html');
        cy.get('[data-tab="dre"]').click();
        help('Resumo do período que mostra se houve lucro ou prejuízo.');
        help(CMV);
        cy.visit('/pdv.html');
        help(CMV);
        cy.visit('/recipes.html');
        help(FICHA);
        cy.visit('/crm.html');
        help('Acompanhamento de clientes: compras e quem chamar de novo.');
      });
    });

    it('PDV sem acesso financeiro esconde o CMV junto com a explicacao', () => {
      stubPdv({ cmv: null, profit: null });
      cy.visit('/pdv.html');
      cy.get('#pdv-register-card').should('be.visible');
      cy.contains('.term-help', CMV).should('not.be.visible');
    });
  });
});
