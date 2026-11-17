describe('Design tokens (paridade visual)', () => {
  const ROOT_TOKENS = {
    '--bg': '#0b1220',
    '--bg-dark': '#070d18',
    '--surface': '#111c33',
    '--accent-text': '#a5b4fc',
    '--on-accent': '#ffffff',
    '--rgb-accent': '79 70 229',
    '--rgb-ink': '15 23 42',
    '--green-600': '#16a34a',
    '--accent': '#4f46e5',
    '--accent-dark': '#4338ca',
    '--white': '#111c33',
    '--slate-500': '#94a3b8',
    '--slate-900': '#f1f5f9',
    '--success-800': '#a7f3d0',
    '--danger-700': '#fca5a5',
  };

  it('define os tokens do tema Grafite Noturno no :root', () => {
    cy.visit('/index.html');
    cy.document().then((doc) => {
      const cs = getComputedStyle(doc.documentElement);
      Object.entries(ROOT_TOKENS).forEach(([name, value]) => {
        expect(cs.getPropertyValue(name).trim().toLowerCase(), name).to.equal(value);
      });
    });
  });

  it('transparencias seguem a marca: rgb(var(--rgb-accent) / alfa) usa o canal do tema da empresa', () => {
    cy.intercept('GET', '**/theme.css', { headers: { 'content-type': 'text/css' }, body: ':root { --accent: #0f766e; --rgb-accent: 15 118 110; }' });
    cy.visit('/index.html');
    cy.document().then((doc) => {
      const probe = doc.createElement('div');
      probe.style.backgroundColor = 'rgb(var(--rgb-accent) / 0.5)';
      doc.body.appendChild(probe);
      expect(getComputedStyle(probe).backgroundColor).to.match(/^rgba\(15, 118, 110, 0\.5\)$|^color\(srgb /);
      probe.remove();
    });
  });

  it('renderiza o login com fundo grafite e texto claro', () => {
    cy.visit('/index.html');
    cy.get('.background').should('have.css', 'background-image').and('contain', 'rgb(11, 18, 32)');
    cy.get('body').should('have.css', 'color', 'rgb(241, 245, 249)');
  });

  it('carrega a paleta em todas as paginas autenticadas (base.css)', () => {
    cy.stubAuthenticated();
    ['/dashboard.html', '/products.html', '/sales.html'].forEach((page) => {
      cy.visit(page);
      cy.document().then((doc) => {
        expect(getComputedStyle(doc.documentElement).getPropertyValue('--slate-900').trim().toLowerCase(), page).to.equal('#f1f5f9');
      });
    });
  });
});