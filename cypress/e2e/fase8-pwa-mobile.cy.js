// Fase 8: PWA (manifesto, service worker, icones) e responsividade mobile (375x667) com a API real.
describe('SGVC - Fase 8: PWA e Mobile', () => {
  it('FASE8-PWA-001 | manifesto, icones e service worker sao servidos e as paginas apontam para eles', () => {
    cy.request('/manifest.webmanifest').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.headers['content-type']).to.match(/manifest\+json|application\/json/);
      const m = res.body;
      expect(m.name).to.contain('SGVC');
      expect(m.display).to.eq('standalone');
      expect(m.start_url).to.eq('/dashboard.html');
      expect(m.icons.map((i) => i.sizes)).to.include.members(['192x192', '512x512']);
      expect(m.icons.some((i) => i.purpose === 'maskable')).to.eq(true);
      m.icons.forEach((icon) => cy.request(icon.src).its('headers.content-type').should('contain', 'image/png'));
    });
    cy.request('/sw.js').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.headers['content-type']).to.contain('javascript');
      // o SW nunca pode guardar a API (dados e sessao ficam na rede)
      expect(res.body).to.contain("startsWith('/api/')");
    });
    cy.request('/offline.html').its('status').should('eq', 200);
    ['/index.html', '/dashboard.html', '/pdv.html', '/finance.html'].forEach((page) => {
      cy.visit(page);
      cy.get('link[rel="manifest"]').should('have.attr', 'href', '/manifest.webmanifest');
      cy.get('meta[name="theme-color"]').should('have.attr', 'content', '#0f172a');
      cy.get('link[rel="apple-touch-icon"]').should('exist');
    });
  });

  it('FASE8-PWA-002 | service worker registra e assume o controle', () => {
    cy.visit('/index.html');
    cy.window().then((win) => win.navigator.serviceWorker.ready.then((reg) => {
      expect(reg.scope).to.eq(`${win.location.origin}/`);
    }));
  });

  it('FASE8-MOB-003 | sem rolagem horizontal e alvos de toque >= 44px nas telas principais (375x667)', () => {
    cy.viewport(375, 667);
    cy.createRealUser('f8mob').then((dono) => {
      cy.loginReal(dono);
      ['/dashboard.html', '/sales.html', '/products.html', '/clients.html', '/pdv.html', '/crm.html', '/finance.html', '/appearance.html'].forEach((page) => {
        cy.visit(page);
        cy.get('main', { timeout: 10000 }).should('be.visible');
        cy.document().then((doc) => {
          const win = doc.defaultView;
          const root = doc.documentElement;
          const problems = [];
          if (root.scrollWidth > root.clientWidth) problems.push(`overflow horizontal (${root.scrollWidth} > ${root.clientWidth})`);
          doc.querySelectorAll('main .button').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && r.height < 43.5) problems.push(`botao "${el.textContent.trim()}" ${Math.round(r.height)}px`);
          });
          doc.querySelectorAll('main input, main select, main textarea').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (['checkbox', 'radio', 'hidden', 'file'].includes(el.type) || !(r.width > 0 && r.height > 0)) return;
            if (parseFloat(win.getComputedStyle(el).fontSize) < 16) problems.push(`campo #${el.id || el.name} fonte < 16px`);
          });
          expect(problems, `${page}`).to.deep.equal([]);
        });
      });
    });
  });
});
