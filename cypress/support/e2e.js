import 'cypress-axe';
import 'cypress-real-events/support';
import 'cypress-mochawesome-reporter/register';
import './commands';

// API simulada: quando o teste simula a sessão (cy.seedSession / cy.loginAsAdmin / cy.clearSession),
// qualquer chamada /api sem stub específico recebe uma resposta neutra em vez de ir ao backend real.
// Sem isso, uma chamada real devolvia 401 e a tela voltava para o login no meio do teste.
// Os stubs específicos dos testes são registrados depois e têm prioridade sobre este.
const EMPTY_BY_PATH = [
  [/\/api\/analytics\/overview/, { customers: 0, products: 0, recipes: 0, linkedProducts: 0, salesCount: 0, revenueTotal: 0, cmvTotal: 0, profitTotal: 0, margin: 0, avgTicket: 0, pricingAlerts: [] }],
  [/\/api\/analytics\/timeseries/, []],
  [/\/api\/reports\/payment-methods/, { total: 0, quantidadeVendas: 0, methods: [] }],
  [/\/api\/reports\/financial/, { revenue: 0, cmv: 0, profit: 0, margin: 0, avgTicket: 0, salesCount: 0 }],
  [/\/api\/reports\/revenue/, { total: 0, quantidadeVendas: 0 }],
  [/\/api\/holidays/, []],
];

beforeEach(() => {
  Cypress.env('sgvcMockApi', null);
  cy.intercept({ url: '**/api/**' }, (req) => {
    const mode = Cypress.env('sgvcMockApi');
    if (!mode) return; // segue para o backend real
    if (/\/api\/auth\/(login|register|forgot|reset)/.test(req.url)) return;
    if (mode === 'anon') {
      req.reply({ statusCode: 401, body: { success: false, message: 'Token inválido ou ausente' } });
      return;
    }
    if (req.method !== 'GET') {
      req.reply({ statusCode: 200, body: {} });
      return;
    }
    const hit = EMPTY_BY_PATH.find(([re]) => re.test(req.url));
    req.reply({ statusCode: 200, body: hit ? hit[1] : [] });
  });
});
