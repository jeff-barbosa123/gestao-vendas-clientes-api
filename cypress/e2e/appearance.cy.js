describe('Aparência (White-Label)', () => {
  const DEFAULT_DTO = {
    companyName: null,
    primaryColor: '#4f46e5',
    backgroundColor: '#0b1220',
    textColor: '#f1f5f9',
    hasLogo: false,
    logoUrl: null,
    isDefault: true,
  };

  const PNG = {
    mimeType: 'image/png',
    fileName: 'logo.png',
    contents: Cypress.Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    ),
  };

  beforeEach(() => {
    cy.stubAuthenticated();
    cy.intercept('GET', '**/api/branding', { statusCode: 200, body: DEFAULT_DTO }).as('getBranding');
    cy.visit('/appearance.html');
    cy.wait('@getBranding');
  });

  it('carrega os valores padrão e mostra contraste AA aprovado', () => {
    cy.get('#primary-color-hex').should('have.value', '#4f46e5');
    cy.get('#background-color-hex').should('have.value', '#0b1220');
    cy.get('#text-color-hex').should('have.value', '#f1f5f9');
    cy.get('#primary-color-badge').should('contain', 'AA aprovado');
    cy.get('#appearance-save').should('not.be.disabled');
  });

  it('mostra contraste insuficiente e bloqueia o salvamento', () => {
    cy.get('#primary-color-hex').clear().type('#ffeb3b');
    cy.get('#primary-color-badge').should('contain', 'abaixo de AA');
    cy.get('#appearance-save').should('be.disabled');
  });

  it('exige texto claro: cor escura no texto fica abaixo de AA e bloqueia o salvamento', () => {
    cy.get('#text-color-hex').clear().type('#111827');
    cy.get('#text-color-badge').should('contain', 'abaixo de AA');
    cy.get('#appearance-save').should('be.disabled');
    cy.get('#text-color-hex').clear().type('#e2e8f0');
    cy.get('#text-color-badge').should('contain', 'AA aprovado');
  });

  it('valida o formato da cor', () => {
    cy.get('#text-color-hex').clear().type('azul');
    cy.get('#text-color-badge').should('contain', 'Use #RRGGBB');
    cy.get('#appearance-save').should('be.disabled');
  });

  it('atualiza a prévia ao trocar cores e nome', () => {
    cy.get('#company-name').type('Doces da Ana');
    cy.get('#background-color-hex').clear().type('#1e3a8a');
    cy.get('#preview-name').should('have.text', 'Doces da Ana');
    cy.get('#appearance-preview').should('have.attr', 'style').and('contain', '#1e3a8a');
  });

  it('salva a paleta enviando os 3 tons e o nome', () => {
    cy.intercept('PUT', '**/api/branding', (req) => {
      expect(req.body).to.deep.include({
        companyName: 'Doces da Ana',
        primaryColor: '#1d4ed8',
        backgroundColor: '#1e3a8a',
        textColor: '#e2e8f0',
      });
      req.reply({ statusCode: 200, body: { ...DEFAULT_DTO, companyName: 'Doces da Ana', primaryColor: '#1d4ed8', isDefault: false } });
    }).as('putBranding');
    cy.get('#company-name').type('Doces da Ana');
    cy.get('#primary-color-hex').clear().type('#1d4ed8');
    cy.get('#background-color-hex').clear().type('#1e3a8a');
    cy.get('#text-color-hex').clear().type('#e2e8f0');
    cy.get('#appearance-save').click();
    cy.wait('@putBranding');
    cy.get('#appearance-form-message').should('contain', 'Aparência salva');
  });

  it('exibe o erro do servidor quando o contraste é recusado', () => {
    cy.intercept('PUT', '**/api/branding', {
      statusCode: 422,
      body: { success: false, code: 'CONTRAST_AA', message: 'Paleta fora do contraste mínimo WCAG AA', error: 'Paleta fora do contraste mínimo WCAG AA' },
    }).as('putRejeitado');
    cy.get('#appearance-save').click();
    cy.wait('@putRejeitado');
    cy.get('#appearance-form-message').should('contain', 'contraste');
  });

  it('envia o logotipo em base64 e mostra a imagem', () => {
    cy.intercept('POST', '**/api/branding/logo', (req) => {
      expect(req.body.contentType).to.equal('image/png');
      expect(req.body.data).to.match(/^iVBOR/);
      req.reply({ statusCode: 200, body: { ...DEFAULT_DTO, hasLogo: true, logoUrl: '/api/branding/logo?v=1' } });
    }).as('postLogo');
    cy.intercept('GET', '**/api/branding/logo?v=1', { statusCode: 200, headers: { 'content-type': 'image/png' }, body: PNG.contents }).as('getLogo');
    cy.get('#logo-file').selectFile(PNG, { force: true });
    cy.wait('@postLogo');
    cy.get('#logo-message').should('contain', "Logotipo 'logo.png' atualizado");
    cy.get('#logo-preview').should('not.have.attr', 'hidden');
    cy.get('#logo-remove').should('not.have.attr', 'hidden');
  });

  it('recusa arquivo de tipo inválido sem chamar a API', () => {
    cy.intercept('POST', '**/api/branding/logo', cy.spy().as('logoCall'));
    cy.get('#logo-file').selectFile({ contents: Cypress.Buffer.from('texto'), fileName: 'a.txt', mimeType: 'text/plain' }, { force: true });
    cy.get('#logo-message').should('contain', 'Formato não suportado');
    cy.get('@logoCall').should('not.have.been.called');
  });

  it('recusa logotipo acima de 512 KB sem chamar a API', () => {
    cy.get('#logo-file').selectFile(
      { contents: Cypress.Buffer.alloc(512 * 1024 + 1), fileName: 'grande.png', mimeType: 'image/png' },
      { force: true }
    );
    cy.get('#logo-message').should('contain', '512 KB');
  });

  it('o dashboard exibe o botão Aparência e leva para a página', () => {
    cy.intercept('GET', '**/api/branding', { statusCode: 200, body: { ...DEFAULT_DTO, companyName: 'Doces da Ana', hasLogo: true, logoUrl: '/api/branding/logo?v=1' } });
    cy.visit('/dashboard.html');
    cy.get('#brand-name').should('contain', 'Doces da Ana');
    // o logotipo mora na navbar (canto esquerdo), nunca ao lado do avatar do usuario
    cy.get('.app-nav-brand #brand-logo').should('have.attr', 'src', '/api/branding/logo?v=1');
    cy.get('.dashboard-userbox #brand-logo').should('not.exist');
    cy.get('.app-nav a[href="/appearance.html"]').click();
    cy.location('pathname').should('eq', '/appearance.html');
  });

  it('logotipo na navbar: 32-36px de altura, object-fit contain, sem distorcer', () => {
    cy.intercept('GET', '**/api/branding', { statusCode: 200, body: { ...DEFAULT_DTO, companyName: 'Doces da Ana', hasLogo: true, logoUrl: '/api/branding/logo?v=1' } });
    // imagem larga (200x50) para provar que a proporcao e preservada
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50"><rect width="200" height="50" fill="#2563eb"/></svg>';
    cy.intercept('GET', '**/api/branding/logo*', { statusCode: 200, headers: { 'content-type': 'image/svg+xml' }, body: svg });
    ['/dashboard.html'].forEach((page) => {
      cy.visit(page);
      cy.get('.app-nav-brand #brand-logo').should(($img) => {
        const r = $img[0].getBoundingClientRect();
        expect(r.height, 'altura').to.be.within(28, 36);
        expect($img[0].naturalWidth, 'carregou').to.be.greaterThan(0);
        expect(r.width / r.height, 'proporcao 4:1').to.be.closeTo(4, 0.15);
        expect(getComputedStyle($img[0]).objectFit).to.eq('contain');
      });
      cy.get('.app-nav-brand').should('not.contain', 'SGVC').and('have.attr', 'aria-label', 'Doces da Ana');
    });
  });

  it('sem logotipo a navbar mantem o texto SGVC', () => {
    cy.intercept('GET', '**/api/branding', { statusCode: 200, body: DEFAULT_DTO });
    cy.visit('/dashboard.html');
    cy.get('.app-nav-brand').should('contain', 'SGVC');
    cy.get('#brand-logo').should('not.exist');
  });

  it('o servidor web entrega /theme.css como CSS (tema padrão para visitante)', () => {
    cy.request('/theme.css').then((res) => {
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.match(/text\/css/);
      expect(res.body).to.not.include('--accent');
    });
  });

  it('o /theme.css pelo servidor web traz ETag e responde 304 na revalidação', () => {
    cy.request('/theme.css').then((res) => {
      const etag = res.headers.etag;
      expect(etag, 'etag').to.match(/^"[0-9a-f]{40}"$/);
      expect(res.headers['cache-control']).to.include('no-cache');
      cy.request({ url: '/theme.css', headers: { 'If-None-Match': etag }, failOnStatusCode: false }).then((again) => {
        expect(again.status).to.equal(304);
      });
    });
  });

  it('botao bloqueado fica visivel como desabilitado e explica o motivo', () => {
    cy.get('#appearance-blocked').should('not.be.visible');
    cy.get('#primary-color-hex').clear().type('#e5d848');
    cy.get('#appearance-save').should('be.disabled').and('have.css', 'opacity', '0.5').and('have.css', 'cursor', 'not-allowed');
    cy.get('#appearance-save').should('have.attr', 'aria-describedby', 'appearance-blocked');
    cy.get('#appearance-blocked').should('be.visible').and('contain', 'Salvar bloqueado: ajuste as cores em vermelho para atingir 4,5:1');
    cy.get('#primary-color-hex').clear().type('#4f46e5');
    cy.get('#appearance-blocked').should('not.be.visible');
    cy.get('#appearance-save').should('not.be.disabled');
  });

  it('a ajuda explica que primaria e fundo sao comparados com o branco', () => {
    cy.get('#contrast-help').should('be.visible').and('contain', 'branco');
  });

  it('Escurecer ate passar corrige primaria e fundo claros e libera o salvamento', () => {
    cy.get('#appearance-fix').should('not.be.visible');
    cy.get('#primary-color-hex').clear().type('#e5d848');
    cy.get('#background-color-hex').clear().type('#e7ebf4');
    cy.get('#appearance-fix').should('be.visible').and('have.text', 'Escurecer até passar').click();
    cy.get('#primary-color-badge').should('contain', 'AA aprovado');
    cy.get('#background-color-badge').should('contain', 'AA aprovado');
    cy.get('#primary-color-hex').invoke('val').should('match', /^#[0-9a-f]{6}$/).and('not.eq', '#e5d848');
    cy.get('#appearance-save').should('not.be.disabled').and('have.focus');
    cy.get('#appearance-fix').should('not.be.visible');
    cy.get('#appearance-blocked').should('not.be.visible');
  });

  it('texto escuro: o botao vira Clarear ate passar e corrige a cor do texto', () => {
    cy.get('#text-color-hex').clear().type('#111827');
    cy.get('#appearance-fix').should('be.visible').and('have.text', 'Clarear até passar').click();
    cy.get('#text-color-badge').should('contain', 'AA aprovado');
    cy.get('#appearance-save').should('not.be.disabled');
  });

  it('depois de ajustar, o salvamento envia as cores corrigidas', () => {
    cy.intercept('PUT', '**/api/branding', (req) => {
      expect(req.body.primaryColor).to.match(/^#[0-9a-f]{6}$/).and.not.eq('#e5d848');
      req.reply({ statusCode: 200, body: { ...DEFAULT_DTO, isDefault: false } });
    }).as('putAjustado');
    cy.get('#primary-color-hex').clear().type('#e5d848');
    cy.get('#appearance-fix').click();
    cy.get('#appearance-save').click();
    cy.wait('@putAjustado');
  });

  it('a ajuda do logotipo explica que ele salva ao escolher o arquivo', () => {
    cy.get('#logo-help').should('be.visible').and('contain', 'salvo assim que').and('contain', 'sem precisar de "Salvar aparência"');
  });

  it('envia o logotipo mesmo com a cor abaixo de 4,5:1 (Salvar desabilitado) e mantem a edicao das cores', () => {
    cy.intercept('POST', '**/api/branding/logo', { statusCode: 200, body: { ...DEFAULT_DTO, hasLogo: true, logoUrl: '/api/branding/logo?v=1' } }).as('postLogoBaixo');
    cy.intercept('GET', '**/api/branding/logo?v=1', { statusCode: 200, headers: { 'content-type': 'image/png' }, body: PNG.contents });
    cy.get('#primary-color-hex').clear().type('#e5d848');
    cy.get('#appearance-save').should('be.disabled');
    cy.get('#logo-file').selectFile(PNG, { force: true });
    cy.wait('@postLogoBaixo');
    cy.get('#logo-message').should('contain', "Logotipo 'logo.png' atualizado");
    cy.get('#appearance-save').should('be.disabled');
    cy.get('#primary-color-hex').should('have.value', '#e5d848');
  });

  it('a barra lateral troca o logotipo na hora ao enviar e volta ao texto SGVC ao remover', () => {
    cy.intercept('POST', '**/api/branding/logo', { statusCode: 200, body: { ...DEFAULT_DTO, hasLogo: true, logoUrl: '/api/branding/logo?v=2', companyName: 'Doces da Ana' } }).as('postLogoNav');
    cy.intercept('GET', '**/api/branding/logo?v=2', { statusCode: 200, headers: { 'content-type': 'image/png' }, body: PNG.contents });
    cy.intercept('DELETE', '**/api/branding/logo', { statusCode: 200, body: DEFAULT_DTO }).as('deleteLogoNav');
    cy.get('.app-nav-brand').should('contain', 'SGVC').and('not.have.class', 'has-logo');
    cy.get('#logo-file').selectFile(PNG, { force: true });
    cy.wait('@postLogoNav');
    cy.get('.app-nav-brand').should('have.class', 'has-logo');
    cy.get('#brand-logo').should('have.attr', 'src', '/api/branding/logo?v=2').and('have.attr', 'alt', 'Logotipo Doces da Ana');
    cy.get('#logo-remove').click();
    cy.wait('@deleteLogoNav');
    cy.get('#brand-logo').should('not.exist');
    cy.get('.app-nav-brand').should('contain', 'SGVC').and('not.have.class', 'has-logo');
  });
});
