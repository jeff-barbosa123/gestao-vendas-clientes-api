// Telas de edicao por perfil: quem so le ve aviso e nao edita; error-monitoring so para o admin da plataforma.
// Permissoes espelham api/src/services/permissions.js (MATRIX).
const MODULES = { producao: true, encomendas: true, financeiro: true, crm: true, pdv: true };
const user = (role, permissions, extra = {}) => ({
  id: `u-${role}`, email: `${role}@negocio.com`, name: role, role, permissions, modules: MODULES, isPlatformAdmin: false, ...extra,
});
const SELLER = user('seller', ['customers:read', 'customers:write', 'products:read', 'sales:read', 'sales:write', 'orders:read', 'orders:write', 'pdv:use', 'analytics:read']);
const STOCKIST = user('stockist', ['products:read', 'products:write', 'ingredients:read', 'ingredients:write', 'recipes:read', 'analytics:read', 'cost:view']);
const OWNER = user('owner', ['customers:read', 'customers:write', 'products:read', 'products:write', 'recipes:read', 'recipes:write', 'ingredients:read', 'ingredients:write', 'sales:read', 'sales:write', 'finance:view', 'analytics:read']);
const VIEWER = user('viewer', ['customers:read', 'products:read', 'recipes:read', 'analytics:read']);

const open = (page, who) => {
  cy.intercept('**/api/**', (req) => { if (req.method === 'GET') req.reply({ statusCode: 200, body: {} }); });
  cy.stubAuthenticated(who);
  cy.visit(`/${page}.html?id=x`, { onBeforeLoad: (w) => w.localStorage.setItem('sgvc.onboarding.dismissed', '1') });
};
const notice = () => cy.get('.readonly-notice', { timeout: 8000 });
const noNotice = () => {
  cy.get('#main').should('exist');
  cy.wait(1200);
  cy.get('.readonly-notice').should('not.exist');
};

describe('SGVC - Telas de edicao por perfil', () => {
  it('PERFIL-001 | Vendedor (so le produtos) ve aviso e nao edita em product-edit', () => {
    open('product-edit', SELLER);
    notice().should('contain.text', 'apenas visualizar');
    cy.get('#save-btn').should('have.attr', 'hidden');
    cy.get('#delete-btn').should('have.attr', 'hidden');
    cy.get('#edit-form input:not([disabled]), #edit-form select:not([disabled]), #edit-form textarea:not([disabled])').should('not.exist');
    cy.get('#back-list').should('not.be.disabled');
  });

  it('PERFIL-002 | Estoquista (so le fichas) ve aviso e nao edita em recipe-edit', () => {
    open('recipe-edit', STOCKIST);
    notice();
    cy.get('#save-btn').should('have.attr', 'hidden');
    cy.get('#delete-btn').should('have.attr', 'hidden');
    cy.get('#edit-form button:not([disabled]), #edit-form input:not([disabled]), #edit-form select:not([disabled])').should('not.exist');
    cy.get('#back-list').should('not.be.disabled');
  });

  it('PERFIL-003 | Perfil so leitura em client-edit e vinculos tambem fica travado', () => {
    open('client-edit', VIEWER);
    notice();
    cy.get('#delete-btn').should('have.attr', 'hidden');
    cy.get('#edit-form input:not([disabled])').should('not.exist');
    open('vinculos', VIEWER);
    notice();
    cy.get('#link-btn').should('have.attr', 'hidden');
    cy.get('#unlink-btn').should('have.attr', 'hidden');
  });

  it('PERFIL-004 | Quem pode escrever nao ve aviso nem perde botoes (Dono e Estoquista em produtos/vinculos)', () => {
    open('recipe-edit', OWNER);
    noNotice();
    cy.get('#delete-btn').should('not.have.attr', 'hidden');
    open('product-edit', STOCKIST);
    noNotice();
    cy.get('#delete-btn').should('not.have.attr', 'hidden');
    open('vinculos', STOCKIST);
    noNotice();
    cy.get('#link-btn').should('not.have.attr', 'hidden');
  });

  it('PERFIL-005 | error-monitoring so para o admin da plataforma', () => {
    open('error-monitoring', OWNER);
    cy.location('pathname', { timeout: 8000 }).should('eq', '/dashboard.html');
    open('error-monitoring', user('owner', OWNER.permissions, { isPlatformAdmin: true }));
    cy.wait(1500);
    cy.location('pathname').should('eq', '/error-monitoring.html');
  });
});
