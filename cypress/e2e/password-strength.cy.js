// Regras de senha. A API (authService) exige 8+ caracteres com maiúscula, minúscula,
// número e caractere especial no cadastro, na troca e no reset de senha.
// O login NÃO exige senha forte: contas antigas precisam continuar entrando.
describe('SGVC - Validação de Força de Senha', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearSession();
  });

  describe('Login', () => {
    it('so recusa senha muito curta', () => {
      cy.get('#email').type('teste@exemplo.com');
      cy.get('#password').type('12');
      cy.get('#login-btn').click();
      cy.get('#password-error').should('be.visible').and('contain', 'Senha muito curta.');
    });

    it('envia senha simples para a API decidir', () => {
      cy.intercept('POST', '**/api/auth/login', (req) => {
        expect(req.body.password).to.eq('senha123');
        req.reply({ statusCode: 401, body: { message: 'Credenciais inválidas' } });
      }).as('loginSimple');
      cy.get('#email').type('teste@exemplo.com');
      cy.get('#password').type('senha123');
      cy.get('#login-btn').click();
      cy.wait('@loginSimple');
      cy.get('#login-error-text').should('contain', 'E-mail ou senha incorretos');
    });
  });

  describe('Cadastro', () => {
    beforeEach(() => {
      cy.get('#open-register').click();
      cy.get('#register-name').type('Usuário Teste');
      cy.get('#register-email').type('usuario@teste.com');
    });

    const weak = [
      ['sem maiúscula', 'senha123!'],
      ['sem minúscula', 'SENHA123!'],
      ['sem número', 'Senha@teste!'],
      ['sem caractere especial', 'Senha1234'],
    ];
    weak.forEach(([label, pwd]) => {
      it(`recusa senha ${label} antes de chamar a API`, () => {
        cy.intercept('POST', '**/api/auth/register', cy.spy().as('registerSpy'));
        cy.get('#register-password').type(pwd);
        cy.get('#register-submit').click();
        cy.get('#register-password-error')
          .should('be.visible')
          .and('contain', 'maiúscula, minúscula, número e caractere especial');
        cy.get('@registerSpy').should('not.have.been.called');
      });
    });

    it('recusa senha com 7 caracteres mesmo atendendo as outras regras', () => {
      cy.get('#register-password').type('A1@bcde');
      cy.get('#register-submit').click();
      cy.get('#register-password-error').should('be.visible').and('contain', 'Mínimo 8 caracteres.');
    });

    it('indicador de força acompanha a digitação', () => {
      cy.get('#register-password').clear().type('s');
      cy.get('#password-strength').should('contain', 'Fraca').and('have.class', 'is-weak');
      cy.get('#register-password').clear().type('senha123');
      cy.get('#password-strength').should('contain', 'Fraca');
      cy.get('#register-password').clear().type('Senha123');
      cy.get('#password-strength').should('contain', 'Média').and('have.class', 'is-medium');
      cy.get('#register-password').clear().type('A1@bcdef');
      cy.get('#password-strength').should('contain', 'Forte').and('have.class', 'is-strong');
    });

    it('lista de regras marca o que ja foi atendido', () => {
      cy.get('#register-password').type('Senha123');
      cy.get('#register-password-rules [data-rule="len"]').should('have.class', 'is-ok');
      cy.get('#register-password-rules [data-rule="upper"]').should('have.class', 'is-ok');
      cy.get('#register-password-rules [data-rule="sym"]').should('not.have.class', 'is-ok');
    });

    ['!', '#', '$', '%', '&', '*', '-', '_', '?', '/'].forEach((char) => {
      it(`aceita "${char}" como caractere especial`, () => {
        cy.intercept('POST', '**/api/auth/register', { statusCode: 201, body: { ok: true } }).as('register');
        cy.intercept('POST', '**/api/auth/login', { statusCode: 200, body: { user: { id: 'u1', email: 'usuario@teste.com' } } });
        cy.stubAuthenticated();
        cy.get('#register-password').type(`Senha12${char}`);
        cy.get('#register-submit').click();
        cy.wait('@register').its('request.body.password').should('eq', `Senha12${char}`);
      });
    });
  });

  describe('Redefinição de senha', () => {
    beforeEach(() => {
      cy.visit('/reset-password.html?token=test-token');
    });

    it('avisa quando a senha tem menos de 8 caracteres', () => {
      cy.get('#new-password').type('Ab1!').blur();
      cy.get('#new-password-error').should('be.visible').and('contain', '8 caracteres');
    });

    it('avisa quando faltam requisitos', () => {
      cy.get('#new-password').type('senha1234').blur();
      cy.get('#new-password-error').should('be.visible').and('contain', 'maiúscula');
    });
  });
});
