describe('Design tokens (paridade visual)', () => {
  const ROOT_TOKENS = {
    '--bg': '#3f73c8',
    '--bg-dark': '#2f5fae',
    '--accent': '#4f46e5',
    '--accent-dark': '#4338ca',
    '--white': '#ffffff',
    '--slate-500': '#64748b',
    '--slate-900': '#0f172a',
    '--success-800': '#065f46',
    '--danger-700': '#b91c1c',
  };

  it('define os tokens no :root com os valores originais', () => {
    cy.visit('/index.html');
    cy.document().then((doc) => {
      const cs = getComputedStyle(doc.documentElement);
      Object.entries(ROOT_TOKENS).forEach(([name, value]) => {
        expect(cs.getPropertyValue(name).trim().toLowerCase(), name).to.equal(value);
      });
    });
  });

  it('mantem as cores renderizadas da tela de login', () => {
    cy.visit('/index.html');
    cy.get('.background').should('have.css', 'background-image').and('contain', 'rgb(63, 115, 200)');
    cy.get('body').should('have.css', 'color', 'rgb(15, 23, 42)');
  });

  it('carrega a paleta em todas as paginas autenticadas (base.css)', () => {
    cy.stubAuthenticated();
    ['/dashboard.html', '/products.html', '/sales.html'].forEach((page) => {
      cy.visit(page);
      cy.document().then((doc) => {
        expect(getComputedStyle(doc.documentElement).getPropertyValue('--slate-900').trim().toLowerCase(), page).to.equal('#0f172a');
      });
    });
  });
});