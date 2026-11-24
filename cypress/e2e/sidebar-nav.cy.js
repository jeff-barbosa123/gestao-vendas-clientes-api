// Sidebar lateral fixa (static/nav.js): grupos, rodapé, logotipo no topo e gaveta no celular.
describe('SGVC - Sidebar de navegação', () => {
  let dono;
  before(() => {
    // um único cadastro por spec (o registro tem limite de taxa)
    cy.createRealUser('sidebar').then((u) => { dono = u; });
  });
  beforeEach(() => {
    cy.loginReal(dono);
  });

  it('SIDEBAR-001 | desktop: fixa à esquerda (~240px), com grupos na ordem e rodapé', () => {
    cy.viewport(1280, 720);
    cy.visit('/dashboard.html');
    cy.get('.app-nav').should('be.visible').then(($nav) => {
      const r = $nav[0].getBoundingClientRect();
      expect(r.left).to.eq(0);
      expect(r.width).to.be.within(230, 240);
      expect(r.height).to.be.closeTo(720, 1);
    });
    cy.get('.app-nav').should('have.css', 'position', 'fixed');
    cy.get('.app-nav-toggle').should('not.be.visible');
    cy.get('.app-nav-heading:not([hidden])').then(($h) => {
      expect([...$h].map((el) => el.textContent.trim())).to.deep.equal([
        'Principal', 'Operação', 'Catálogo & Custos', 'Clientes & Financeiro', 'Conta',
      ]);
    });
    const hrefs = [
      '/dashboard.html', '/pdv.html', '/sales.html', '/orders.html',
      '/products.html', '/ingredients.html', '/recipes.html', '/vinculos.html', '/simulacao.html',
      '/clients.html', '/crm.html', '/finance.html', '/reports.html',
      '/profile.html', '/team.html', '/appearance.html',
    ];
    // Equipe entra depois que as permissões carregam (access.js)
    cy.get('.app-nav-links a[href="/team.html"]').should('exist');
    cy.get('.app-nav-links a').should(($a) => {
      expect([...$a].map((a) => a.getAttribute('href'))).to.deep.equal(hrefs);
    });
    cy.get('#nav-logout').scrollIntoView().should('contain', 'Sair').and('be.visible');
    cy.get('.app-nav a.is-active').should('have.attr', 'href', '/dashboard.html');
    cy.get('main').then(($m) => {
      expect($m[0].getBoundingClientRect().left).to.be.at.least(230);
    });
  });

  it('SIDEBAR-002 | logotipo (ou SGVC) fica no topo da coluna, alinhado com o menu', () => {
    cy.viewport(1280, 720);
    cy.visit('/dashboard.html');
    cy.get('.app-nav-brand').should('contain', 'SGVC').then(($b) => {
      const br = $b[0].getBoundingClientRect();
      expect(br.top).to.be.lessThan(80);
      expect(br.left).to.be.lessThan(20);
    });
  });

  it('SIDEBAR-003 | celular: menu recolhido abre e fecha pelo botão', () => {
    cy.viewport(375, 667);
    cy.visit('/dashboard.html');
    cy.get('.app-nav-toggle').should('be.visible').and('have.attr', 'aria-expanded', 'false');
    cy.get('#app-nav-links').should('not.be.visible');
    cy.get('.app-nav-toggle').click().should('have.attr', 'aria-expanded', 'true');
    cy.get('#app-nav-links').should('be.visible');
    cy.get('.app-nav-links a[href="/sales.html"]').should('be.visible');
    cy.get('.app-nav-toggle').click().should('have.attr', 'aria-expanded', 'false');
    cy.get('#app-nav-links').should('not.be.visible');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
  });

  it('SIDEBAR-004 | Sair pede confirmação e volta ao login', () => {
    cy.viewport(1280, 720);
    cy.visit('/dashboard.html');
    cy.on('window:confirm', () => true);
    cy.get('#nav-logout').scrollIntoView().click();
    cy.location('pathname').should('be.oneOf', ['/', '/index.html']);
  });
});
