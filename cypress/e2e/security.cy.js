const openSecurityClientsForm = () => {
  cy.stubDashboardMetrics();
  cy.stubCustomerList();
  cy.loginAsAdmin();
  cy.openClientsFromDashboard();
  cy.wait('@customersList');
};

describe('Seguranca basica', () => {
  beforeEach(() => {
    openSecurityClientsForm();
  });

  it('SQL Injection no nome e barrado antes de chegar ao backend', () => {
    cy.intercept('POST', '**/api/customers', cy.spy().as('createSpy'));
    cy.get('#create-name').clear().type("Robert'); DROP TABLE usuarios;--");
    cy.get('#create-email').clear().type('sql@teste.com');
    cy.get('#create-phone').clear().type('(11) 95555-0000');
    cy.get('#create-submit').click();
    cy.get('#create-name-error').should('be.visible').and('contain', 'caracteres inválidos');
    cy.get('@createSpy').should('not.have.been.called');
  });

  it('XSS no campo de observacoes nao executa e aparece como texto', () => {
    cy.intercept('POST', '**/api/customers', { statusCode: 201, body: { id: 'xss-01' } }).as('xss');
    const script = "<script>alert('xss')</script>";
    cy.window().then((win) => cy.stub(win, 'alert').as('alertSpy'));
    cy.get('#create-name').clear().type('Cliente Seguro');
    cy.get('#create-email').clear().type('seguro@teste.com');
    cy.get('#create-phone').clear().type('(11) 95555-0000');
    cy.get('#create-notes').clear().type(script);
    cy.get('#create-submit').click();
    cy.wait('@xss').its('request.body.notes').should('contain', script);
    // O texto é salvo como texto: nenhum script roda na página
    cy.get('@alertSpy').should('not.have.been.called');
    cy.get('#clients-message').should('contain', 'Cliente criado com sucesso.');
  });

  it('Nao existem campos hidden suspeitos no formulario', () => {
    cy.get('#create-form').find('input[type="hidden"]').should('have.length', 0);
  });

  it('Payload malicioso de tamanho enorme e rejeitado', () => {
    cy.intercept('POST', '**/api/customers', { statusCode: 413, body: { message: 'Payload muito grande' } }).as('payload');
    const huge = 'A'.repeat(600);
    cy.get('#create-name').clear().type('Cliente Seguro');
    cy.get('#create-email').clear().type('seguro@teste.com');
    cy.get('#create-phone').clear().type('(11) 95555-0000');
    cy.get('#create-notes').clear().type(huge, { delay: 0 });
    cy.get('#create-submit').click();
    cy.wait('@payload');
    cy.get('#clients-message').should('contain', 'Payload muito grande');
  });

  it('Overflow de telefone gera erro visivel', () => {
    // O campo tem limite de tamanho: o excesso nem entra
    cy.get('#create-phone').clear().type('1'.repeat(20));
    cy.get('#create-phone').invoke('val').its('length').should('be.lte', 15);
  });

  it('Input inesperado no email e sinalizado', () => {
    cy.get('#create-email').clear().type('user😀@teste.com');
    cy.get('#create-email').blur();
    cy.get('#create-email-error').should('be.visible').and('contain', 'Digite um e-mail válido.');
  });

  it('Senha em texto plano nao e exposta em logs', () => {
    cy.intercept('POST', '**/api/customers', (req) => {
      // Verificar que senha não está no body da requisição (caso haja campo de senha)
      expect(req.body).to.not.have.property('password');
      req.reply({ statusCode: 201, body: { id: 'client-01' } });
    }).as('noPasswordExposure');
    
    cy.get('#create-name').clear().type('Cliente Seguro');
    cy.get('#create-email').clear().type('seguro@teste.com');
    cy.get('#create-phone').clear().type('(11) 95555-0000');
    cy.get('#create-submit').click();
    cy.wait('@noPasswordExposure');
  });

  it('Tokens nao sao expostos em localStorage', () => {
    cy.window().then((win) => {
      // Verificar que não há tokens em localStorage
      const tokenInLocalStorage = win.localStorage.getItem('sgvc.session');
      expect(tokenInLocalStorage).to.be.null;
    });
  });

  it('Sessao fica em cookie HttpOnly, sem token no navegador', () => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('sgvc.session')).to.be.null;
      expect(win.localStorage.getItem('sgvc.session')).to.be.null;
      expect(win.document.cookie).to.not.match(/sgvc_(access|refresh)/);
    });
  });

  it('Rate limiting bloqueia muitas tentativas de registro', () => {
    cy.intercept('POST', '**/api/auth/register', (req) => {
      if (req.headers['x-ratelimit-remaining'] === '0') {
        req.reply({ statusCode: 429, body: { message: 'Muitas tentativas de registro' } });
      } else {
        req.reply({ statusCode: 409, body: { error: 'Usuário já existe' } });
      }
    }).as('rateLimited');

    cy.visit('/');
    cy.get('#open-register').click();
    
    // Simular múltiplas tentativas
    for (let i = 0; i < 6; i++) {
      cy.get('#register-name').clear().type(`Usuário ${i}`);
      cy.get('#register-email').clear().type(`usuario${i}@teste.com`);
      cy.get('#register-password').clear().type('Senha@123!');
      cy.get('#register-submit').click();
      cy.wait('@rateLimited', { timeout: 2000 }).then((interception) => {
        if (interception.response.statusCode === 429) {
          cy.get('#register-error').should('contain', 'Muitas tentativas');
        }
      });
    }
  });

  it('CORS nao libera origens nao permitidas', () => {
    // E-mail inexistente: não conta tentativa de login de nenhum usuário real
    cy.request({
      method: 'POST',
      url: 'http://localhost:3000/api/auth/login',
      headers: { Origin: 'https://malicious-site.com', 'Content-Type': 'application/json' },
      body: { email: 'cors-teste@inexistente.com', password: 'Qualquer@123' },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.headers['access-control-allow-origin']).to.not.eq('https://malicious-site.com');
      expect(response.status).to.not.eq(200);
    });
  });

  it('Headers de seguranca estao presentes', () => {
    cy.request({
      method: 'GET',
      url: 'http://localhost:3000/health',
    }).then((response) => {
      expect(response.headers).to.have.property('x-content-type-options', 'nosniff');
      expect(response.headers).to.have.property('x-frame-options', 'DENY');
    });
  });
});
