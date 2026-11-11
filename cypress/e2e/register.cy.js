describe('SGVC - Registro de Usuário', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearSession();
  });

  it('abre o modal de registro ao clicar em Criar conta', () => {
    cy.get('#open-register').click();
    cy.get('#register-modal').should('have.class', 'is-active');
    cy.get('#register-modal').should('have.attr', 'aria-hidden', 'false');
    cy.get('#register-title').should('be.visible').and('contain', 'Criar conta');
  });

  it('valida nome obrigatorio no registro', () => {
    cy.get('#open-register').click();
    cy.get('#register-submit').click();
    cy.get('#register-name-error').should('be.visible').and('contain', 'Informe o nome.');
    cy.focused().should('have.attr', 'id', 'register-name');
  });

  it('valida email obrigatorio no registro', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Usuário Teste');
    cy.get('#register-submit').click();
    cy.get('#register-email-error').should('be.visible').and('contain', 'Digite um e-mail válido.');
  });

  it('valida email invalido no registro', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Usuário Teste');
    cy.get('#register-email').type('emailinvalido.com');
    cy.get('#register-password').type('Senha@123!');
    cy.get('#register-submit').click();
    cy.get('#register-email-error').should('be.visible').and('contain', 'Digite um e-mail válido.');
  });

  it('valida senha obrigatoria no registro', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Usuário Teste');
    cy.get('#register-email').type('usuario@teste.com');
    cy.get('#register-submit').click();
    cy.get('#register-password-error').should('be.visible').and('contain', 'Mínimo 8 caracteres.');
  });

  it('valida senha muito curta no registro', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Usuário Teste');
    cy.get('#register-email').type('usuario@teste.com');
    cy.get('#register-password').type('123');
    cy.get('#register-submit').click();
    cy.get('#register-password-error').should('be.visible').and('contain', 'Mínimo 8 caracteres.');
  });

  it('valida senha fraca sem maiuscula no registro', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Usuário Teste');
    cy.get('#register-email').type('usuario@teste.com');
    cy.get('#register-password').type('senha1234!');
    cy.get('#register-submit').click();
    cy.get('#register-password-error').should('be.visible').and('contain', 'maiúscula, minúscula, número e caractere especial');
  });

  it('valida senha fraca sem minuscula no registro', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Usuário Teste');
    cy.get('#register-email').type('usuario@teste.com');
    cy.get('#register-password').type('SENHA1234!');
    cy.get('#register-submit').click();
    cy.get('#register-password-error').should('be.visible').and('contain', 'maiúscula, minúscula, número e caractere especial');
  });

  it('valida senha fraca sem numero no registro', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Usuário Teste');
    cy.get('#register-email').type('usuario@teste.com');
    cy.get('#register-password').type('Senha@teste!');
    cy.get('#register-submit').click();
    cy.get('#register-password-error').should('be.visible').and('contain', 'maiúscula, minúscula, número e caractere especial');
  });

  it('valida senha fraca sem caractere especial no registro', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Usuário Teste');
    cy.get('#register-email').type('usuario@teste.com');
    cy.get('#register-password').type('Senha1234');
    cy.get('#register-submit').click();
    cy.get('#register-password-error').should('be.visible').and('contain', 'maiúscula, minúscula, número e caractere especial');
  });

  it('mostra indicador de forca da senha fraca', () => {
    cy.get('#open-register').click();
    cy.get('#register-password').type('senha');
    cy.get('#password-strength').should('be.visible').and('contain', 'Fraca');
    cy.get('#password-strength').should('have.class', 'is-weak');
  });

  it('mostra indicador de forca da senha media', () => {
    cy.get('#open-register').click();
    cy.get('#register-password').type('Senha123');
    cy.get('#password-strength').should('be.visible').and('contain', 'Média');
    cy.get('#password-strength').should('have.class', 'is-medium');
  });

  it('mostra indicador de forca da senha forte', () => {
    cy.get('#open-register').click();
    cy.get('#register-password').type('Senha@123!');
    cy.get('#password-strength').should('be.visible').and('contain', 'Forte');
    cy.get('#password-strength').should('have.class', 'is-strong');
  });

  it('registra usuario com sucesso e faz login automatico', () => {
    cy.intercept('POST', '**/api/auth/register', {
      statusCode: 201,
      body: {
        message: 'Usuário criado com sucesso',
        user: { id: 'new-user', email: 'novo@usuario.com', name: 'Novo Usuário' },
      },
    }).as('register');
    
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
        user: { id: 'new-user', email: 'novo@usuario.com', name: 'Novo Usuário' },
        exp: Date.now() + 900000,
        jti: 'jti-123',
        refreshJti: 'refresh-jti-123',
      },
    }).as('autoLogin');

    cy.stubDashboardMetrics({ alias: 'dashboardAfterRegister' });

    cy.get('#open-register').click();
    cy.get('#register-name').type('Novo Usuário');
    cy.get('#register-email').type('novo@usuario.com');
    cy.get('#register-password').type('Novo@123!');
    cy.get('#register-submit').click();

    cy.wait('@register');
    cy.wait('@autoLogin');
    cy.wait('@dashboardAfterRegister');
    
    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard.html');
    
    // Verificar que token foi salvo em sessionStorage
    cy.window().then((win) => {
      const session = win.sessionStorage.getItem('sgvc.session');
      expect(session).to.not.be.null;
      const parsed = JSON.parse(session);
      expect(parsed).to.have.property('token', 'new-token');
      expect(parsed).to.have.property('refreshToken', 'new-refresh-token');
    });
  });

  it('mostra erro quando email ja existe no registro', () => {
    cy.intercept('POST', '**/api/auth/register', {
      statusCode: 409,
      body: { error: 'Usuário já existe' },
    }).as('registerDuplicate');

    cy.get('#open-register').click();
    cy.get('#register-name').type('Usuário Existente');
    cy.get('#register-email').type('existente@teste.com');
    cy.get('#register-password').type('Existente@123!');
    cy.get('#register-submit').click();

    cy.wait('@registerDuplicate');
    cy.get('#register-error').should('be.visible').and('contain', 'Usuário já existe');
  });

  it('fecha o modal ao clicar no X', () => {
    cy.get('#open-register').click();
    cy.get('#register-modal').should('have.class', 'is-active');
    cy.get('#register-close-btn').click();
    cy.get('#register-modal').should('not.have.class', 'is-active');
    cy.get('#register-modal').should('have.attr', 'aria-hidden', 'true');
  });

  it('fecha o modal ao clicar em cancelar', () => {
    cy.get('#open-register').click();
    cy.get('#register-modal').should('have.class', 'is-active');
    cy.get('#register-cancel').click();
    cy.get('#register-modal').should('not.have.class', 'is-active');
  });

  it('fecha o modal ao pressionar Escape', () => {
    cy.get('#open-register').click();
    cy.get('#register-modal').should('have.class', 'is-active');
    cy.get('#register-modal').type('{esc}');
    cy.get('#register-modal').should('not.have.class', 'is-active');
  });

  it('valida campos em tempo real durante digitacao', () => {
    cy.get('#open-register').click();
    
    // Nome válido
    cy.get('#register-name').type('Teste');
    cy.get('#register-name').focus().blur();
    cy.get('#register-name-status').should('be.visible').and('contain', 'OK');
    cy.get('#register-name').should('have.class', 'is-valid');
    
    // Email válido
    cy.get('#register-email').type('teste@exemplo.com');
    cy.get('#register-email').focus().blur();
    cy.get('#register-email-status').should('be.visible').and('contain', 'OK');
    cy.get('#register-email').should('have.class', 'is-valid');
    
    // Senha forte
    cy.get('#register-password').type('Senha@123!');
    cy.get('#register-password').focus().blur();
    cy.get('#register-password-status').should('be.visible').and('contain', 'OK');
    cy.get('#register-password').should('have.class', 'is-valid');
  });

  it('mostra avatar com inicial do nome', () => {
    cy.get('#open-register').click();
    cy.get('#register-avatar').should('contain', 'U');
    cy.get('#register-name').type('Maria');
    cy.get('#register-avatar').should('contain', 'M');
    cy.get('#register-name').clear().type('João Silva');
    cy.get('#register-avatar').should('contain', 'J');
  });

  it('toggle de senha funciona no registro', () => {
    cy.get('#open-register').click();
    cy.get('#register-password').type('Senha@123!');
    cy.get('#register-password').should('have.attr', 'type', 'password');
    cy.get('#toggle-register-password').click();
    cy.get('#register-password').should('have.attr', 'type', 'text');
    cy.get('#toggle-register-password').click();
    cy.get('#register-password').should('have.attr', 'type', 'password');
  });

  it('atualiza indicador de forca da senha durante digitacao', () => {
    cy.get('#open-register').click();
    cy.get('#register-password').type('s');
    cy.get('#password-strength').should('contain', 'Fraca');
    cy.get('#register-password').clear().type('Senha123');
    cy.get('#password-strength').should('contain', 'Média');
    cy.get('#register-password').clear().type('Senha@123!');
    cy.get('#password-strength').should('contain', 'Forte');
  });

  it('limpa campos ao fechar o modal', () => {
    cy.get('#open-register').click();
    cy.get('#register-name').type('Teste');
    cy.get('#register-email').type('teste@exemplo.com');
    cy.get('#register-password').type('Senha@123!');
    cy.get('#register-cancel').click();
    cy.get('#open-register').click();
    cy.get('#register-name').should('have.value', '');
    cy.get('#register-email').should('have.value', '');
    cy.get('#register-password').should('have.value', '');
  });

  it('foca no campo nome ao abrir o modal', () => {
    cy.get('#open-register').click();
    cy.focused().should('have.attr', 'id', 'register-name');
  });
});
