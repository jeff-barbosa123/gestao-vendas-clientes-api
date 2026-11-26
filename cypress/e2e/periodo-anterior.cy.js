// Comparacao do painel: mes, trimestre ou ano anterior completo do calendario (API simulada).
import { computePreviousPeriod } from '../../web/public/dashboard/period.js';

describe('SGVC - Periodo anterior completo no painel', () => {
  // Tabela escrita a mao (independente do calculo da tela). Entre 2025 e 2029, so 2028 e bissexto.
  const pad = (n) => String(n).padStart(2, '0');
  const lastDay = (y, m) => [31, y === 2028 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  const range = (y, first, last) => ({ start: `${y}-${pad(first)}-01`, end: `${y}-${pad(last)}-${pad(lastDay(y, last))}` });
  const YEARS = [2026, 2027, 2028];

  describe('calculo das datas', () => {
    it('todos os meses de 2026 a 2028, inclusive fevereiro bissexto e virada de ano', () => {
      YEARS.forEach((y) => {
        for (let m = 1; m <= 12; m += 1) {
          const expected = m === 1 ? range(y - 1, 12, 12) : range(y, m - 1, m - 1);
          expect(computePreviousPeriod(range(y, m, m)), `${m}/${y}`).to.deep.equal({ ...expected, unit: 'month' });
        }
      });
    });

    it('todos os trimestres de 2026 a 2028', () => {
      YEARS.forEach((y) => {
        [1, 4, 7, 10].forEach((first) => {
          const expected = first === 1 ? range(y - 1, 10, 12) : range(y, first - 3, first - 1);
          expect(computePreviousPeriod(range(y, first, first + 2)), `${first}/${y}`).to.deep.equal({ ...expected, unit: 'quarter' });
        });
      });
    });

    it('anos de 2026 a 2029, antes e depois do bissexto', () => {
      [2026, 2027, 2028, 2029].forEach((y) => {
        expect(computePreviousPeriod({ start: `${y}-01-01`, end: `${y}-12-31` }), String(y))
          .to.deep.equal({ start: `${y - 1}-01-01`, end: `${y - 1}-12-31`, unit: 'year' });
      });
    });

    it('intervalo que nao e mes, trimestre ou ano do calendario nao gera comparacao', () => {
      [
        ['2026-11-02', '2026-11-30'], // nao comeca no dia 1
        ['2026-11-01', '2026-11-29'], // nao termina no ultimo dia
        ['2026-01-01', '2026-02-28'], // dois meses
        ['2026-02-01', '2026-04-30'], // tres meses fora do trimestre
        ['2026-07-01', '2027-06-30'], // doze meses fora do ano
        ['2026-11-30', '2026-11-01'], // invertido
        ['', '2026-11-30'],
        ['abc', 'def'],
      ].forEach(([start, end]) => expect(computePreviousPeriod({ start, end }), `${start}..${end}`).to.equal(null));
    });
  });

  describe('cartao "Faturamento e tendencia"', () => {
    const HINT = (variation, label) => `Variação de ${variation} em relação ao ${label} anterior completo. O período atual ainda está em andamento.`;

    // revenueBy: faturamento por consulta "inicio..fim"; consulta nao prevista devolve zero.
    const open = (instant, revenueBy) => {
      const queries = [];
      cy.stubAuthenticated();
      cy.intercept('GET', '**/api/reports/financial*', (req) => {
        const params = new URL(req.url).searchParams;
        const key = `${params.get('start')}..${params.get('end')}`;
        queries.push(key);
        const revenue = revenueBy[key] || 0;
        req.reply({ revenue, salesCount: revenue ? 3 : 0 });
      });
      cy.clock(new Date(instant).getTime(), ['Date']);
      cy.visit('/dashboard.html', { onBeforeLoad: (win) => win.localStorage.setItem('sgvc.onboarding.dismissed', '1') });
      return queries;
    };
    const asked = (queries, key) => cy.wrap(queries, { timeout: 10000 }).should('include', key);
    const hint = (text) => cy.get('#alert-revenue-hint').should('have.text', text);

    [
      ['mes', 'month', '2026-11-25T15:00:00Z', '2026-11-01..2026-11-30', '2026-10-01..2026-10-31', 'mês'],
      ['trimestre', 'quarter', '2026-05-10T15:00:00Z', '2026-04-01..2026-06-30', '2026-01-01..2026-03-31', 'trimestre'],
      ['ano', 'year', '2028-05-10T15:00:00Z', '2028-01-01..2028-12-31', '2027-01-01..2027-12-31', 'ano'],
    ].forEach(([name, value, instant, current, previous, label]) => {
      it(`filtro ${name}: consulta o periodo anterior certo e explica a comparacao`, () => {
        const queries = open(instant, { [current]: 600, [previous]: 1000 });
        // O seletor so dispara a carga quando muda de valor.
        if (value === 'month') cy.get('#dashboard-period').select('year');
        cy.get('#dashboard-period').select(value);
        asked(queries, current);
        asked(queries, previous);
        hint(HINT('-40,0%', label));
      });
    });

    it('virada do dia em Fortaleza: 30/11 as 22:30 ainda compara novembro com outubro inteiro', () => {
      const queries = open('2026-12-01T01:30:00Z', { '2026-11-01..2026-11-30': 1500, '2026-10-01..2026-10-31': 1500 });
      asked(queries, '2026-11-01..2026-11-30');
      asked(queries, '2026-10-01..2026-10-31');
      hint(HINT('+0,0%', 'mês'));
    });

    it('venda de 01/10 entra na base: R$ 1.500 contra R$ 1.500 da 0%, e nao +50%', () => {
      // A API simulada soma as vendas dentro das datas pedidas.
      const SALES = [['2026-10-01', 500], ['2026-10-15', 1000], ['2026-11-10', 1500]];
      cy.stubAuthenticated();
      cy.intercept('GET', '**/api/reports/financial*', (req) => {
        const params = new URL(req.url).searchParams;
        const list = SALES.filter(([day]) => day >= params.get('start') && day <= params.get('end'));
        req.reply({ revenue: list.reduce((sum, [, total]) => sum + total, 0), salesCount: list.length });
      });
      cy.clock(new Date('2026-11-25T15:00:00Z').getTime(), ['Date']);
      cy.visit('/dashboard.html', { onBeforeLoad: (win) => win.localStorage.setItem('sgvc.onboarding.dismissed', '1') });
      hint(HINT('+0,0%', 'mês'));
    });

    it('sem faturamento no periodo anterior continua "Sem dados comparativos"', () => {
      const queries = open('2026-11-25T15:00:00Z', { '2026-11-01..2026-11-30': 600 });
      asked(queries, '2026-10-01..2026-10-31');
      cy.get('#alert-revenue-message').should('contain', '600,00');
      hint('Sem dados comparativos');
    });

    [[1280, 800], [375, 812]].forEach(([width, height]) => {
      it(`texto novo visivel sem rolagem lateral em ${width}px`, () => {
        cy.viewport(width, height);
        open('2026-11-25T15:00:00Z', { '2026-11-01..2026-11-30': 600, '2026-10-01..2026-10-31': 1000 });
        hint(HINT('-40,0%', 'mês'));
        cy.get('#alert-revenue-hint').scrollIntoView().should('be.visible');
        cy.document().then((doc) => {
          expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1);
        });
      });
    });
  });
});
