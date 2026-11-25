// Dia comercial em America/Fortaleza nas telas. Venda "so data" (meia-noite UTC) mantem o dia gravado;
// venda com horario (PDV, encomenda) vale o dia em Fortaleza. Todas as respostas da API sao simuladas.
describe('SGVC - Fuso das vendas (America/Fortaleza)', () => {
  describe('Periodo do dashboard', () => {
    const CASES = [
      ['30/11 as 22:30: mes ainda e novembro', '2026-12-01T01:30:00Z', 'month', '2026-11-01', '2026-11-30'],
      ['30/11 as 23:59:59: mes ainda e novembro', '2026-12-01T02:59:59Z', 'month', '2026-11-01', '2026-11-30'],
      ['01/12 a meia-noite: mes e dezembro', '2026-12-01T03:00:00Z', 'month', '2026-12-01', '2026-12-31'],
      ['31/12 as 22:30: trimestre ainda e o 4o de 2026', '2027-01-01T01:30:00Z', 'quarter', '2026-10-01', '2026-12-31'],
      ['31/12 as 22:30: ano ainda e 2026', '2027-01-01T01:30:00Z', 'year', '2026-01-01', '2026-12-31'],
      ['01/01 a meia-noite: trimestre ja e o 1o de 2027', '2027-01-01T03:00:00Z', 'quarter', '2027-01-01', '2027-03-31'],
      ['01/01 a meia-noite: ano ja e 2027', '2027-01-01T03:00:00Z', 'year', '2027-01-01', '2027-12-31'],
      ['29/02 bissexto as 22:30: mes e fevereiro', '2028-03-01T01:30:00Z', 'month', '2028-02-01', '2028-02-29'],
    ];

    CASES.forEach(([title, instant, period, start, end]) => {
      it(title, () => {
        const urls = [];
        cy.intercept('GET', '**/api/**', { body: [] });
        cy.intercept('GET', '**/api/analytics/overview*', (req) => {
          urls.push(req.url);
          req.reply({ fixture: 'dashboard-overview.json' });
        }).as('overview');
        cy.seedSession();
        cy.clock(new Date(instant).getTime(), ['Date']);
        cy.visit('/dashboard.html');
        cy.wait('@overview');
        // Troca para outro periodo e volta, para a consulta do periodo escolhido acontecer sempre
        cy.get('#dashboard-period').select(period === 'year' ? 'month' : 'year');
        cy.get('#dashboard-period').select(period);
        cy.wrap(urls, { timeout: 10000 }).should((list) => {
          const dated = list.filter((u) => u.includes('start='));
          expect(dated.some((u) => u.includes(`start=${start}&end=${end}`)), dated.join(' | ')).to.equal(true);
        });
      });
    });
  });

  const sale = (id, name, date) => ({
    id,
    customerName: name,
    total: 10,
    date,
    status: 'ACTIVE',
    paymentMethod: 'CASH',
    items: [{ productId: 'product-1', productName: 'Bolo de Chocolate', quantity: 1, unitPrice: 10 }],
  });

  describe('Tela de vendas', () => {
    const SALES = [
      [sale('s-pdv', 'PDV a noite', '2026-12-01T01:00:00.000Z'), '30/11/2026', '2026-11-30'],
      [sale('s-dia', 'So data', '2026-11-30T00:00:00.000Z'), '30/11/2026', '2026-11-30'],
      [sale('s-vira', 'Meia-noite local', '2026-12-01T03:00:00.000Z'), '01/12/2026', '2026-12-01'],
      [sale('s-ano', 'Ano novo so data', '2027-01-01T00:00:00.000Z'), '01/01/2027', '2027-01-01'],
    ];

    beforeEach(() => {
      cy.intercept('GET', '**/api/sales', { body: SALES.map(([s]) => s) }).as('salesList');
      cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' }).as('productsList');
      cy.intercept({ method: 'GET', pathname: '/api/customers' }, { fixture: 'customers-list.json' });
      SALES.forEach(([s]) => cy.intercept('GET', `**/api/sales/${s.id}`, s));
      cy.seedSession();
      cy.visit('/sales.html');
      cy.wait(['@salesList', '@productsList']);
      cy.get('#sales-body tr.sales-row').should('have.length', SALES.length);
    });

    it('lista mostra o dia comercial de cada venda', () => {
      SALES.forEach(([s, shown]) => {
        cy.contains('#sales-body tr.sales-row', s.customerName).should('contain', shown);
      });
    });

    it('detalhes mostram o dia em Fortaleza', () => {
      cy.get('#sales-body button[data-view-id="s-pdv"]').contains('Detalhes').click();
      cy.get('#sale-details-date').should('contain', '30/11/2026');
    });

    SALES.forEach(([s, , input]) => {
      it(`edicao de "${s.customerName}" abre e salva o dia ${input}`, () => {
        cy.intercept('PUT', `**/api/sales/${s.id}`, { statusCode: 200, body: { id: s.id } }).as('updateSale');
        cy.get(`#sales-body button[data-edit-id="${s.id}"]`).click();
        cy.get('#edit-date').should('have.value', input);
        cy.get('#edit-form').submit();
        cy.wait('@updateSale').its('request.body.date').should('eq', input);
      });
    });
  });

  describe('Filtro de periodo da lista de vendas', () => {
    // Nome de cada venda = dia comercial esperado (+ origem)
    const FILTER_SALES = [
      ['30-11 PDV', '2026-12-01T01:00:00.000Z'],
      ['01-12 data', '2026-12-01T00:00:00.000Z'],
      ['01-11 data', '2026-11-01T00:00:00.000Z'],
      ['31-10 PDV', '2026-11-01T02:59:59.999Z'],
      ['24-11 data', '2026-11-24T00:00:00.000Z'],
      ['23-11 PDV', '2026-11-24T02:59:59.999Z'],
      ['01-10 data', '2026-10-01T00:00:00.000Z'],
      ['30-09 PDV', '2026-10-01T02:59:59.999Z'],
      ['01-01 data', '2026-01-01T00:00:00.000Z'],
      ['31-12-2025 PDV', '2026-01-01T02:59:59.999Z'],
    ].map(([name, date], i) => sale(`f${i}`, name, date));
    const ALL = FILTER_SALES.map((s) => s.customerName);

    function openAt(instant) {
      cy.intercept('GET', '**/api/sales', { body: FILTER_SALES }).as('salesList');
      cy.intercept('GET', '**/api/products', { fixture: 'products-list.json' });
      cy.intercept({ method: 'GET', pathname: '/api/customers' }, { fixture: 'customers-list.json' });
      cy.seedSession();
      cy.clock(new Date(instant).getTime(), ['Date']);
      cy.visit('/sales.html');
      cy.wait('@salesList');
      cy.get('#sales-body tr.sales-row').should('have.length', FILTER_SALES.length);
    }

    function expectFilter(period, names) {
      cy.get('#filter-period').select(period, { force: true });
      cy.get('#sales-total').should('have.text', `(${names.length})`);
      cy.get('#sales-body tr.sales-row').should('have.length', names.length);
      names.forEach((name) => cy.contains('#sales-body tr.sales-row', name).should('exist'));
    }

    it('30/11 as 22:30: hoje, 7 e 30 dias, mes, trimestre e ano', () => {
      openAt('2026-12-01T01:30:00Z');
      expectFilter('today', ['30-11 PDV']);
      expectFilter('7', ['30-11 PDV', '24-11 data']);
      expectFilter('30', ['30-11 PDV', '01-11 data', '24-11 data', '23-11 PDV']);
      expectFilter('month', ['30-11 PDV', '01-11 data', '24-11 data', '23-11 PDV']);
      expectFilter('quarter', ALL.slice(0, 7));
      expectFilter('year', ALL.slice(0, 9));
      expectFilter('', ALL);
    });

    it('01/12 a meia-noite: hoje e mes passam para dezembro', () => {
      openAt('2026-12-01T03:00:00Z');
      expectFilter('today', ['01-12 data']);
      expectFilter('month', ['01-12 data']);
    });
  });

  describe('CRM', () => {
    it('ultima compra e historico usam o dia comercial', () => {
      const customer = {
        id: 'c1',
        name: 'Maria',
        phone: '81999990000',
        whatsappPhone: '5581999990000',
        status: 'em_dia',
        purchases: 2,
        spent: 20,
        ticketAvg: 10,
        avgIntervalDays: null,
        daysSinceLast: 1,
        lastPurchaseAt: '2026-12-01T01:00:00.000Z',
        expectedAt: null,
        lastContactAt: null,
      };
      cy.intercept('GET', '**/api/**', { body: [] });
      cy.stubAuthenticated({ id: 'u1', email: 'dono@negocio.com', name: 'Dono', role: 'owner', modules: {}, permissions: ['customers:read', 'customers:write', 'sales:read', 'analytics:read'] });
      cy.intercept({ method: 'GET', pathname: '/api/crm/customers' }, { body: { customers: [customer], counts: { em_dia: 1 } } }).as('crmList');
      cy.intercept({ method: 'GET', pathname: '/api/crm/customers/c1' }, {
        body: {
          customer,
          sales: [
            { id: 'a', date: '2026-12-01T01:00:00.000Z', status: 'ACTIVE', units: 1, total: 10 },
            { id: 'b', date: '2026-11-15T00:00:00.000Z', status: 'ACTIVE', units: 1, total: 10 },
          ],
          topProducts: [],
          interactions: [],
        },
      }).as('crmDetail');
      cy.visit('/crm.html');
      cy.wait('@crmList');
      cy.contains('#crm-body tr', 'Maria').should('contain', '30/11/2026');
      cy.get('#crm-body button[data-open="c1"]').click();
      cy.wait('@crmDetail');
      cy.get('#crm-sales li').should('have.length', 2);
      cy.get('#crm-sales li').eq(0).should('contain', '30/11/2026');
      cy.get('#crm-sales li').eq(1).should('contain', '15/11/2026');
    });
  });
});
