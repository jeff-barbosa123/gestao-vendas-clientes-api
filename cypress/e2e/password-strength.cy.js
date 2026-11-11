describe('SGVC - Validação de Força de Senha', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearSession();
  });

  describe('Validação de senha forte no login', () => {
    it('rejeita senha muito curta (< 8 caracteres)', () => {
      cy.get('#email').type('teste@exemplo.com');
      cy.get('#password').type('123');
      cy.get('#password').blur();
      cy.get('#password-error').should('be.visible').and('contain', 'Senha muito fraca');
    });

    it('rejeita senha sem maiuscula', () => {
      cy.get('#email').type('teste@exemplo.com');
      cy.get('#password').type('senha123!');
      cy.get('#login-btn').click();
      cy.get('#password-error').should('be.visible').and('contain', 'maiúscula');
    });

    it('rejeita senha sem minuscula', () => {
      cy.get('#email').type('teste@exemplo.com');
      cy.get('#password').type('SENHA123!');
      cy.get('#login-btn').click();
      cy.get('#password-error').should('be.visible').and('contain', 'minúscula');
    });

    it('rejeita senha sem numero', () => {
      cy.get('#email').type('teste@exemplo.com');
      cy.get('#password').type('Senha@teste!');
      cy.get('#login-btn').click();
      cy.get('#password-error').should('be.visible').and('contain', 'número');
    });

    it('rejeita senha sem caractere especial', () => {
      cy.get('#email').type('teste@exemplo.com');
      cy.get('#password').type('Senha1234');
      cy.get('#login-btn').click();
      cy.get('#password-error').should('be.visible').and('contain', 'caractere especial');
    });

    it('aceita senha forte completa', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          token: 'token-ok',
          refreshToken: 'refresh-ok',
          user: { id: 'u1', email: 'teste@exemplo.com' },
        },
      }).as('loginStrong');

      cy.get('#email').type('teste@exemplo.com');
      cy.get('#password').type('Senha@123!');
      cy.get('#login-btn').click();
      cy.wait('@loginStrong');
      // Não deve ter erro
      cy.get('#password-error').should('not.be.visible');
    });
  });

  describe('Validação de senha forte no registro', () => {
    beforeEach(() => {
      cy.get('#open-register').click();
    });

    it('mostra indicador visual de força da senha', () => {
      // Senha fraca
      cy.get('#register-password').type('senha');
      cy.get('#password-strength').should('contain', 'Fraca').and('have.class', 'is-weak');
      
      // Senha média
      cy.get('#register-password').clear().type('Senha123');
      cy.get('#password-strength').should('contain', 'Média').and('have.class', 'is-medium');
      
      // Senha forte
      cy.get('#register-password').clear().type('Senha@123!');
      cy.get('#password-strength').should('contain', 'Forte').and('have.class', 'is-strong');
    });

    it('valida requisitos em tempo real durante digitacao', () => {
      cy.get('#register-password').type('s'); // Muito curta
      cy.get('#password-strength').should('contain', 'Fraca');
      
      cy.get('#register-password').clear().type('senha123'); // Falta maiúscula e especial
      cy.get('#password-strength').should('contain', 'Fraca');
      
      cy.get('#register-password').clear().type('Senha123'); // Falta especial
      cy.get('#password-strength').should('contain', 'Média');
      
      cy.get('#register-password').clear().type('Senha@123!'); // Completa
      cy.get('#password-strength').should('contain', 'Forte');
    });

    it('rejeita registro com senha fraca', () => {
      cy.get('#register-name').type('Usuário Teste');
      cy.get('#register-email').type('usuario@teste.com');
      cy.get('#register-password').type('senha123'); // Fraca
      cy.get('#register-submit').click();
      cy.get('#register-password-error').should('be.visible').and('contain', 'maiúscula, minúscula, número e caractere especial');
    });

    it('aceita registro com senha forte', () => {
      cy.intercept('POST', '**/api/auth/register', {
        statusCode: 201,
        body: { message: 'Usuário criado com sucesso' },
      }).as('registerStrong');

      cy.get('#register-name').type('Usuário Teste');
      cy.get('#register-email').type('usuario@teste.com');
      cy.get('#register-password').type('Usuario@123!');
      cy.get('#register-submit').click();
      cy.wait('@registerStrong');
      // Não deve ter erro de senha
      cy.get('#register-password-error').should('not.be.visible');
    });
  });

  describe('Validação de senha forte no reset', () => {
    beforeEach(() => {
      cy.visit('/reset-password.html?token=test-token');
    });

    it('valida senha forte no reset de senha', () => {
      cy.get('input[type="password"]').first().type('senha123');
      cy.get('input[type="password"]').first().blur();
      cy.get('.help.is-danger').should('be.visible').and('contain', '8 caracteres');
    });

    it('valida todos os requisitos no reset', () => {
      cy.get('input[type="password"]').first().type('senha1234'); // Falta maiúscula e especial
      cy.get('button[type="submit"]').click();
      cy.get('.help.is-danger').should('be.visible').and('contain', 'maiúscula, minúscula, número e caractere especial');
    });
  });

  describe('Casos de borda', () => {
    it('valida senha no limite minimo (8 caracteres) que atende todos os requisitos', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          token: 'token-ok',
          refreshToken: 'refresh-ok',
          user: { id: 'u1', email: 'teste@exemplo.com' },
        },
      }).as('loginMin');

      cy.get('#email').type('teste@exemplo.com');
      cy.get('#password').type('A1@bcdef'); // Exatamente 8 chars com todos requisitos
      cy.get('#login-btn').click();
      cy.wait('@loginMin');
      cy.get('#password-error').should('not.be.visible');
    });

    it('valida senha com 7 caracteres mesmo com todos requisitos', () => {
      cy.get('#email').type('teste@exemplo.com');
      cy.get('#password').type('A1@bcde'); // 7 chars (muito curta)
      cy.get('#login-btn').click();
      cy.get('#password-error').should('be.visible').and('contain', 'Senha muito fraca');
    });

    it('valida senha com caracteres especiais diversos', () => {
      const specialChars = ['!', '@', '#', '$', '%', '&', '*', '(', ')', '-', '_', '+', '=', '{', '}', '[', ']', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/'];
      
      specialChars.forEach((char) => {
        cy.intercept('POST', '**/api/auth/login', {
          statusCode: 200,
          body: {
            token: 'token-ok',
            refreshToken: 'refresh-ok',
            user: { id: 'u1', email: 'teste@exemplo.com' },
          },
        }).as(`login${char}`);

        cy.get('#email').clear().type('teste@exemplo.com');
        cy.get('#password').clear().type(`Senha1${char}`);
        cy.get('#login-btn').click();
        cy.wait(`@login${char}`, { timeout: 1000 }).then(() => {
          cy.get('#password-error').should('not.be.visible');
        });
        
        cy.visit('/');
        cy.clearSession();
      });
    }, 30000); // Timeout maior para múltiplos testes
  });
});
