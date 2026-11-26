const openAccessibilityClients = () => {
  cy.stubDashboardMetrics();
  cy.stubCustomerList();
  cy.loginAsAdmin();
  cy.openClientsFromDashboard();
  cy.wait('@customersList');
  cy.openClientForm(); // cadastro recolhido quando ja ha clientes
};

describe('Acessibilidade basica', () => {
  beforeEach(() => {
    openAccessibilityClients();
  });

  it('Navegacao por teclado percorre os principais campos', () => {
    // ordem dos campos do formulario: parte do primeiro campo (o botao Novo cliente vem antes no DOM)
    cy.get('#create-type').focus();
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'id', 'create-name');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'id', 'create-email');
  });

  it('Foco visivel usa outline ou sombra', () => {
    cy.get('#create-name').focus();
    cy.get('#create-name').should(($el) => {
      const style = window.getComputedStyle($el[0]);
      expect(style.outlineStyle !== 'none' || style.boxShadow !== 'none').to.equal(true);
    });
  });

  it('Labels associados existem para os inputs', () => {
    cy.get('label[for="create-name"]').should('exist');
    cy.get('label[for="create-email"]').should('exist');
    cy.get('label[for="create-phone"]').should('exist');
  });

  it('Contraste minimo mantem o botao visivel', () => {
    cy.get('#create-submit').should(($btn) => {
      const style = window.getComputedStyle($btn[0]);
      expect(style.backgroundColor).not.equal('rgba(0, 0, 0, 0)');
      expect(style.color).not.equal('transparent');
    });
  });

  it('Leitura de tela basica passa no axe', () => {
    cy.injectAxe();
    cy.checkA11y('#main', {
      runOnly: ['wcag2a', 'wcag2aa'],
    });
  });
});

describe('Contraste WCAG AA no tema Grafite Noturno', () => {
  const PAGES = [
    '/index.html',
    '/dashboard.html',
    '/clients.html',
    '/client-edit.html',
    '/products.html',
    '/product-edit.html',
    '/sales.html',
    '/orders.html',
    '/recipes.html',
    '/recipe-edit.html',
    '/ingredients.html',
    '/simulacao.html',
    '/vinculos.html',
    '/reports.html',
    '/profile.html',
    '/appearance.html',
    '/team.html',
    '/accept-invite.html',
    '/reset-password.html',
  ];

  const logViolations = (violations) => {
    const rows = violations.flatMap((v) =>
      v.nodes.map((n) => `${v.id} | ${n.target.join(' ')} | ${(n.any[0] && n.any[0].message) || ''}`)
    );
    cy.task('log', rows.join('\n'), { log: false });
  };

  PAGES.forEach((page) => {
    it(`${page} atinge contraste AA (axe color-contrast)`, () => {
      cy.stubAuthenticated();
      cy.visit(page);
      cy.wait(800);
      cy.injectAxe();
      cy.checkA11y(
        null,
        { runOnly: { type: 'rule', values: ['color-contrast'] } },
        logViolations
      );
    });
  });

  it('a cor de acento clara (--accent-text) tem contraste AA sobre a superficie escura', () => {
    cy.visit('/index.html');
    cy.document().then((doc) => {
      const cs = getComputedStyle(doc.documentElement);
      const lum = (hex) => {
        const [r, g, b] = [1, 3, 5].map((i) => {
          const c = parseInt(hex.slice(i, i + 2), 16) / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (a, b) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
      };
      const get = (n) => cs.getPropertyValue(n).trim();
      expect(ratio(get('--accent-text'), get('--surface'))).to.be.at.least(4.5);
      expect(ratio(get('--ink'), get('--surface'))).to.be.at.least(4.5);
      expect(ratio(get('--muted'), get('--surface'))).to.be.at.least(4.5);
      expect(ratio(get('--on-accent'), get('--accent'))).to.be.at.least(4.5);
    });
  });
});

describe('Acessibilidade estrutural (skip link, h1, borda dos campos, alternadores)', () => {
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const parse = (css) => css.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);

  it('A11Y-001 | Link "Pular para o conteudo" existe nas telas internas e leva o foco ao main', () => {
    openAccessibilityClients();
    cy.get('body').children().first().should('have.class', 'skip-link').and('have.attr', 'href', '#main');
    cy.get('.skip-link').should('contain.text', 'Pular para o conte').focus().should('be.visible');
    cy.get('.skip-link').click();
    cy.focused().should('have.attr', 'id', 'main');
  });

  it('A11Y-002 | Cada tela interna tem exatamente um h1', () => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    [
      'dashboard', 'clients', 'client-edit', 'products', 'product-edit', 'recipes', 'recipe-edit', 'ingredients',
      'sales', 'orders', 'finance', 'crm', 'pdv', 'reports', 'simulacao', 'vinculos', 'profile', 'appearance', 'team',
    ].forEach((page) => {
      cy.visit(`/${page}.html`);
      cy.get('main h1').should('have.length', 1);
    });
  });

  it('A11Y-003 | Borda dos campos tem contraste >= 3:1 com o fundo do campo', () => {
    openAccessibilityClients();
    cy.get('#create-name').then(($el) => {
      const cs = window.getComputedStyle($el[0]);
      expect(ratio(parse(cs.borderTopColor), parse(cs.backgroundColor))).to.be.at.least(3);
    });
    cy.get('#create-type').then(($el) => {
      const cs = window.getComputedStyle($el[0]);
      expect(ratio(parse(cs.borderTopColor), parse(cs.backgroundColor))).to.be.at.least(3);
    });
  });

  it('A11Y-004 | Alternadores do menu tem pelo menos 24px de altura (desktop e celular)', () => {
    openAccessibilityClients();
    cy.get('.app-nav-group-toggle').should('have.length.at.least', 1).each(($b) => {
      expect($b[0].getBoundingClientRect().height).to.be.at.least(24);
    });
    cy.viewport(375, 700);
    cy.get('.app-nav-toggle').should('be.visible').then(($b) => {
      expect($b[0].getBoundingClientRect().height).to.be.at.least(24);
    });
  });
});