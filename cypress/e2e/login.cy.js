describe('Login UI', () => {
  const LOGIN_URL = '**/api/auth/login';

  beforeEach(() => {
    cy.visit('/index.html');
  });

  it('exibe erro quando o e-mail esta vazio', () => {
    cy.get('#login-btn').click();
    cy.get('#email-error').should('be.visible').and('contain', 'E-mail obrigatório.');
    cy.focused().should('have.attr', 'id', 'email');
  });

  it('exibe erro quando o e-mail e invalido', () => {
    cy.get('#email').type('emailinvalido.com');
    cy.get('#password').type('123456');
    cy.get('#login-btn').click();
    cy.get('#email-error').should('be.visible').and('contain', 'Formato de e-mail inválido.');
  });

  it('exibe erro quando a senha e muito curta', () => {
    cy.get('#email').type('teste@exemplo.com');
    cy.get('#password').type('12');
    cy.get('#login-btn').click();
    cy.get('#password-error').should('be.visible').and('contain', 'Senha muito fraca');
  });

  it('exibe erro quando a senha nao atende requisitos de forca', () => {
    cy.get('#email').type('teste@exemplo.com');
    cy.get('#password').type('senha123'); // Falta maiúscula e especial
    cy.get('#login-btn').click();
    cy.get('#password-error').should('be.visible').and('contain', 'maiúscula, minúscula, número e caractere especial');
  });

  it('exibe erro quando senha tem apenas maiusculas', () => {
    cy.get('#email').type('teste@exemplo.com');
    cy.get('#password').type('SENHA123!'); // Falta minúscula
    cy.get('#login-btn').click();
    cy.get('#password-error').should('be.visible').and('contain', 'maiúscula, minúscula, número e caractere especial');
  });

  it('exibe erro quando senha nao tem numero', () => {
    cy.get('#email').type('teste@exemplo.com');
    cy.get('#password').type('Senha@test'); // Falta número
    cy.get('#login-btn').click();
    cy.get('#password-error').should('be.visible').and('contain', 'maiúscula, minúscula, número e caractere especial');
  });

  it('exibe erro quando senha nao tem caractere especial', () => {
    cy.get('#email').type('teste@exemplo.com');
    cy.get('#password').type('Senha1234'); // Falta especial
    cy.get('#login-btn').click();
    cy.get('#password-error').should('be.visible').and('contain', 'maiúscula, minúscula, número e caractere especial');
  });

  it('impede login sem senha e foca no campo de senha', () => {
    cy.get('#email').type('teste@exemplo.com');
    cy.get('#login-btn').click();
    cy.get('#password-error').should('be.visible').and('contain', 'Senha obrigatoria.');
    cy.focused().should('have.attr', 'id', 'password');
  });

  it('desabilita o botao quando ha erro ativo', () => {
    cy.get('#email').type('emailinvalido.com').blur();
    cy.get('#email-error').should('be.visible');
    cy.get('#login-btn').should('be.disabled');
  });

  it('remove espacos automaticamente antes de enviar', () => {
    cy.intercept('POST', LOGIN_URL, (req) => {
      expect(req.body.email).to.equal('admin@negocio.com');
      expect(req.body.password).to.equal('admin123');
      req.reply({
        statusCode: 200,
        body: {
          token: 'token-fake',
          refreshToken: 'refresh-fake',
          user: { id: 'u1', email: 'admin@negocio.com' },
        },
      });
    }).as('loginTrim');

    cy.get('#email').type('  admin@negocio.com  ');
    cy.get('#password').type('  Admin@123!  ');
    cy.get('#login-btn').click();
    cy.wait('@loginTrim');
  });

  it('faz login com sucesso e redireciona para o dashboard', () => {
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 200,
      body: {
        token: 'token-fake',
        refreshToken: 'refresh-fake',
        user: { id: 'u1', email: 'admin@negocio.com' },
      },
    }).as('login');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('Admin@123!');
    cy.get('#login-btn').click();

    cy.wait('@login');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard.html');
  });

  it('exibe mensagem amigavel quando as credenciais sao invalidas', () => {
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 401,
      body: { error: 'Credenciais invalidos' },
    }).as('loginFail');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('senhaerrada');
    cy.get('#login-btn').click();

    cy.wait('@loginFail');
    cy.get('#login-error').should('be.visible');
    cy.get('#login-error-text').should('contain', 'E-mail ou senha incorretos');
  });

  it('exibe bloqueio temporario apos muitas tentativas', () => {
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 423,
      body: { error: 'Acesso temporariamente bloqueado' },
    }).as('loginBlocked');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('senhaerrada');
    cy.get('#login-btn').click();

    cy.wait('@loginBlocked');
    cy.get('#login-error-text').should('contain', 'Muitas tentativas');
  });

  it('bloqueia apos 3 tentativas invalidas (401) e desabilita o botao', () => {
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 401,
      body: { error: 'Credenciais invalidos' },
    }).as('login401');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('senhaerrada');

    cy.get('#login-btn').click();
    cy.wait('@login401');
    cy.get('#login-btn').click();
    cy.wait('@login401');
    cy.get('#login-btn').click();
    cy.wait('@login401');

    cy.get('#login-error-text').should('contain', 'Muitas tentativas');
    cy.get('#login-btn').should('be.disabled');
  });

  it('permite login apos o tempo de bloqueio', () => {
    cy.clock();
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 401,
      body: { error: 'Credenciais invalidos' },
    }).as('login401');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('senhaerrada');

    cy.get('#login-btn').click();
    cy.wait('@login401');
    cy.get('#login-btn').click();
    cy.wait('@login401');
    cy.get('#login-btn').click();
    cy.wait('@login401');
    cy.get('#login-btn').should('be.disabled');

    cy.tick(15000);

    cy.intercept('POST', LOGIN_URL, {
      statusCode: 200,
      body: {
        token: 'token-fake',
        refreshToken: 'refresh-fake',
        user: { id: 'u1', email: 'admin@negocio.com' },
      },
    }).as('loginAfterBlock');

    cy.get('#password').clear().type('Admin@123!');
    cy.get('#login-btn').click();
    cy.wait('@loginAfterBlock');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard.html');
  });

  it('mostra carregamento durante o login', () => {
    cy.intercept('POST', LOGIN_URL, (req) => {
      req.reply({
        statusCode: 200,
        delay: 800,
        body: {
          token: 'token-fake',
          refreshToken: 'refresh-fake',
          user: { id: 'u1', email: 'admin@negocio.com' },
        },
      });
    }).as('loginDelay');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('Admin@123!');
    cy.get('#login-btn').click();
    cy.get('#login-btn').should('have.class', 'is-loading');
    cy.get('#login-btn').should('contain', 'Entrando');
    cy.get('#login-btn').should('be.disabled');
    cy.wait('@loginDelay');
  });

  it('abre o modal de esqueci minha senha e valida email vazio', () => {
    cy.get('#forgot-password-link').click();
    cy.get('#forgot-modal').should('be.visible').and('have.attr', 'aria-hidden', 'false');
    cy.get('#forgot-submit').click();
    cy.get('#forgot-email-error').should('be.visible').and('contain', 'Informe o e-mail.');
  });

  it('valida email invalido no modal de esqueci minha senha', () => {
    cy.get('#forgot-password-link').click();
    cy.get('#forgot-email').type('emailinvalido.com');
    cy.get('#forgot-submit').click();
    cy.get('#forgot-email-error').should('be.visible').and('contain', 'Digite um e-mail válido.');
  });

  it('mostra mensagem de sucesso no esqueci minha senha', () => {
    cy.intercept('POST', 'http://localhost:3000/api/auth/forgot', {
      statusCode: 200,
      body: { sent: true },
    }).as('forgot');

    cy.get('#forgot-password-link').click();
    cy.get('#forgot-email').type('cliente@teste.com');
    cy.get('#forgot-submit').click();
    cy.wait('@forgot');
    cy.get('#forgot-msg').should(
      'contain',
      'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.'
    );
  });

  it('exibe aviso de Caps Lock quando ativo', () => {
    cy.get('#password')
      .focus()
      .trigger('keydown', {
        key: 'A',
        getModifierState: () => true,
      });
    cy.get('#password-capslock').should('be.visible');
    cy.get('#password').blur();
    cy.get('#password-capslock').should('not.be.visible');
  });

  it('mantem atributos de acessibilidade basicos', () => {
    cy.get('label[for="email"]').should('exist');
    cy.get('#email')
      .should('have.attr', 'aria-required', 'true')
      .and('have.attr', 'aria-describedby', 'email-help');
    cy.get('label[for="password"]').should('exist');
    cy.get('#password').should('have.attr', 'aria-required', 'true');
    cy.get('#login-error').should('have.attr', 'role', 'alert');
  });

  it('toggle de senha alterna o estado aria-pressed', () => {
    cy.get('#toggle-password')
      .as('toggleBtn')
      .then(($btn) => {
        const initial = $btn.attr('aria-pressed');
        cy.get('@toggleBtn').click();
        const expected = initial === 'true' ? 'false' : 'true';
        cy.get('@toggleBtn').should('have.attr', 'aria-pressed', expected);
      });
  });

  it('mostra e oculta a senha no campo de login', () => {
    cy.get('#password').should('have.attr', 'type', 'password');
    cy.get('#toggle-password').click();
    cy.get('#password').should('have.attr', 'type', 'text');
    cy.get('#toggle-password').click();
    cy.get('#password').should('have.attr', 'type', 'password');
  });

  it('envia o login ao pressionar Enter no formulario', () => {
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 200,
      body: {
        token: 'token-fake',
        refreshToken: 'refresh-fake',
        user: { id: 'u1', email: 'admin@negocio.com' },
      },
    }).as('loginEnter');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('Admin@123!{enter}');

    cy.wait('@loginEnter');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard.html');
  });

  it('foca automaticamente o campo de e-mail ao carregar a tela', () => {
    cy.focused().should('have.attr', 'id', 'email');
  });

  it('passa verificacao basica do axe', () => {
    cy.injectAxe();
    cy.checkA11y(
      'main',
      {
        runOnly: ['wcag2a', 'wcag2aa'],
      },
      (violations) => {
        cy.task('writeAxeReport', violations || []);
      }
    );
  });

  it('salva email no lembrar-me apos login', () => {
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 200,
      body: {
        token: 'token-fake',
        refreshToken: 'refresh-fake',
        user: { id: 'u1', email: 'admin@negocio.com' },
      },
    }).as('loginRemember');

    cy.get('#remember-me').check();
    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('Admin@123!');
    cy.get('#login-btn').click();
    cy.wait('@loginRemember');

    cy.window().then((win) => {
      // Email ainda salva em localStorage (não é sensível)
      const saved = win.localStorage.getItem('sgvc.rememberEmail');
      expect(saved).to.equal('admin@negocio.com');
      // Token deve estar em sessionStorage agora
      const session = win.sessionStorage.getItem('sgvc.session');
      expect(session).to.not.be.null;
      const parsed = JSON.parse(session);
      expect(parsed).to.have.property('token', 'token-fake');
    });
  });

  it('nao salva email quando lembrar-me nao esta marcado', () => {
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 200,
      body: {
        token: 'token-fake',
        refreshToken: 'refresh-fake',
        user: { id: 'u1', email: 'admin@negocio.com' },
      },
    }).as('loginNoRemember');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('Admin@123!');
    cy.get('#login-btn').click();
    cy.wait('@loginNoRemember');

    cy.window().then((win) => {
      const saved = win.localStorage.getItem('sgvc.rememberEmail');
      expect(saved).to.be.null;
      // Token deve estar em sessionStorage
      const session = win.sessionStorage.getItem('sgvc.session');
      expect(session).to.not.be.null;
    });
  });

  it('preenche email automaticamente quando ha email salvo', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('sgvc.rememberEmail', 'cliente@teste.com');
    });
    cy.reload();
    cy.get('#email').should('have.value', 'cliente@teste.com');
  });

  it('exibe mensagem de erro de rede quando nao consegue conectar', () => {
    cy.intercept('POST', LOGIN_URL, { forceNetworkError: true }).as('loginNetworkError');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('Admin@123!');
    cy.get('#login-btn').click();
    cy.wait('@loginNetworkError');
    cy.get('#login-error-text').should('contain', 'Não foi possível conectar ao servidor. Tente novamente em alguns instantes.');
  });

  it('mantem layout basico em tela pequena', () => {
    cy.viewport(360, 640);
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible');
    cy.get('#login-btn').should('be.visible');
  });

  it('mantem layout basico em tablet', () => {
    cy.viewport(768, 1024);
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible');
    cy.get('#login-btn').should('be.visible');
  });

  it('permite navegar pelos campos usando apenas teclado', () => {
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'id', 'email');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'id', 'password');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'id', 'toggle-password');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'id', 'remember-me');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'id', 'forgot-password-link');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'id', 'login-btn');
    cy.focused().then(($el) => {
      const style = window.getComputedStyle($el[0]);
      const hasOutline = style.outlineStyle && style.outlineStyle !== 'none';
      const hasShadow = style.boxShadow && style.boxShadow !== 'none';
      expect(hasOutline || hasShadow).to.equal(true);
    });
    cy.screenshot('login-tab-focus');
  });

  it('executa login ao pressionar Enter no campo de e-mail', () => {
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 200,
      body: {
        token: 'token-fake',
        refreshToken: 'refresh-fake',
        user: { id: 'u1', email: 'admin@negocio.com' },
      },
    }).as('loginEnterEmail');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('Admin@123!');
    cy.get('#email').focus().type('{enter}');
    cy.wait('@loginEnterEmail');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard.html');
  });

  it('abre o modal de cadastro', () => {
    cy.get('#open-register').click();
    cy.get('#register-modal').should('have.class', 'is-active');
    cy.get('#register-modal').should('have.attr', 'aria-hidden', 'false');
  });

  it('exibe erro ao tentar cadastrar sem nome', () => {
    cy.get('#open-register').click();
    cy.get('#register-submit').click();
    cy.get('#register-name-error').should('be.visible').and('contain', 'Informe o nome.');
  });

  it('exibe erro ao informar e-mail invalido no cadastro', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Cliente Teste');
    cy.get('#register-email').type('emailinvalido.com');
    cy.get('#register-password').type('senha1234');
    cy.get('#register-submit').click();
    cy.get('#register-email-error')
      .should('be.visible')
      .and('contain', 'Digite um e-mail válido.');
  });

  it('exibe erro ao informar senha curta no cadastro', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Cliente Teste');
    cy.get('#register-email').type('cliente@teste.com');
    cy.get('#register-password').type('123');
    cy.get('#register-submit').click();
    cy.get('#register-password-error')
      .should('be.visible')
      .and('contain', 'Mínimo 8 caracteres.');
  });

  it('exibe erro ao informar senha fraca no cadastro', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Cliente Teste');
    cy.get('#register-email').type('cliente@teste.com');
    cy.get('#register-password').type('senha1234'); // Falta maiúscula e especial
    cy.get('#register-submit').click();
    cy.get('#register-password-error')
      .should('be.visible')
      .and('contain', 'maiúscula, minúscula, número e caractere especial');
  });

  it('mostra indicador de forca da senha no cadastro', () => {
    cy.get('#open-register').click();
    cy.get('#register-password').type('senha');
    cy.get('#password-strength').should('contain', 'Fraca');
    
    cy.get('#register-password').clear().type('Senha123');
    cy.get('#password-strength').should('contain', 'Média');
    
    cy.get('#register-password').clear().type('Senha@123!');
    cy.get('#password-strength').should('contain', 'Forte');
  });

  it('cria conta valida e faz login automatico', () => {
    cy.intercept('POST', 'http://localhost:3000/api/auth/register', {
      statusCode: 200,
      body: { ok: true },
    }).as('register');
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 200,
      body: {
        token: 'token-fake',
        refreshToken: 'refresh-fake',
        user: { id: 'u1', email: 'cliente@teste.com' },
      },
    }).as('loginAfterRegister');

    cy.get('#open-register').click();
    cy.get('#register-name').type('Cliente Teste');
    cy.get('#register-email').type('cliente@teste.com');
    cy.get('#register-password').type('Cliente@123!'); // Senha forte
    cy.get('#register-submit').click();

    cy.wait('@register');
    cy.wait('@loginAfterRegister');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard.html');
    
    // Verificar que token foi salvo em sessionStorage
    cy.window().then((win) => {
      const session = win.sessionStorage.getItem('sgvc.session');
      expect(session).to.not.be.null;
      const parsed = JSON.parse(session);
      expect(parsed).to.have.property('token', 'token-fake');
    });
  });

  it('fecha o modal ao clicar em cancelar', () => {
    cy.get('#open-register').click();
    cy.get('#register-cancel').click();
    cy.get('#register-modal').should('not.have.class', 'is-active');
  });

  it('fecha o modal ao clicar no X', () => {
    cy.get('#open-register').click();
    cy.get('#register-close-btn').click();
    cy.get('#register-modal').should('not.have.class', 'is-active');
  });

  it('remove o email salvo ao desmarcar lembrar-me', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('sgvc.rememberEmail', 'cliente@teste.com');
    });
    cy.reload();
    cy.get('#remember-me').should('be.checked');

    cy.intercept('POST', LOGIN_URL, {
      statusCode: 200,
      body: {
        token: 'token-fake',
        refreshToken: 'refresh-fake',
        user: { id: 'u1', email: 'cliente@teste.com' },
      },
    }).as('loginNoRemember');

    cy.get('#remember-me').uncheck();
    cy.get('#password').type('admin123');
    cy.get('#login-btn').click();
    cy.wait('@loginNoRemember');
    cy.window().then((win) => {
      const saved = win.localStorage.getItem('sgvc.rememberEmail');
      expect(saved).to.be.null;
    });
  });

  it('nao quebra ao atualizar a pagina durante login', () => {
    cy.intercept('POST', LOGIN_URL, (req) => {
      req.reply({
        statusCode: 200,
        delay: 1000,
        body: {
          token: 'token-fake',
          refreshToken: 'refresh-fake',
          user: { id: 'u1', email: 'admin@negocio.com' },
        },
      });
    }).as('loginRefresh');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('admin123');
    cy.get('#login-btn').click();
    cy.reload();
    cy.get('#email').should('be.visible');
  });

  it('evita multiplos envios com clique rapido', () => {
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 200,
      body: {
        token: 'token-fake',
        refreshToken: 'refresh-fake',
        user: { id: 'u1', email: 'admin@negocio.com' },
      },
    }).as('loginMulti');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('Admin@123!');
    cy.get('#login-btn').click().click().click();
    cy.wait('@loginMulti');
    cy.get('@loginMulti.all').should('have.length', 1);
  });

  it('valida que senha forte aceita login', () => {
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 200,
      body: {
        token: 'token-fake',
        refreshToken: 'refresh-fake',
        user: { id: 'u1', email: 'admin@negocio.com' },
      },
    }).as('loginStrong');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('MyP@ssw0rd123!');
    cy.get('#login-btn').click();
    cy.wait('@loginStrong');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard.html');
  });

  it('salva token em sessionStorage ao inves de localStorage', () => {
    cy.intercept('POST', LOGIN_URL, {
      statusCode: 200,
      body: {
        token: 'token-fake',
        refreshToken: 'refresh-fake',
        user: { id: 'u1', email: 'admin@negocio.com' },
      },
    }).as('loginSessionStorage');

    cy.get('#email').type('admin@negocio.com');
    cy.get('#password').type('Admin@123!');
    cy.get('#login-btn').click();
    cy.wait('@loginSessionStorage');
    
    cy.window().then((win) => {
      // Token deve estar em sessionStorage
      const sessionStorageToken = win.sessionStorage.getItem('sgvc.session');
      expect(sessionStorageToken).to.not.be.null;
      
      // localStorage não deve ter token (apenas email se lembrar-me marcado)
      const localStorageToken = win.localStorage.getItem('sgvc.session');
      expect(localStorageToken).to.be.null;
      
      const parsed = JSON.parse(sessionStorageToken);
      expect(parsed).to.have.property('token', 'token-fake');
      expect(parsed).to.have.property('refreshToken', 'refresh-fake');
      expect(parsed).to.have.property('user');
    });
  });
});
