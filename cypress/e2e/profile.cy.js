describe('SGVC - Perfil do Usuário', () => {
  beforeEach(() => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
  });

  it('carrega pagina de perfil', () => {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 'user-1',
          email: 'admin@negocio.com',
          name: 'Admin User',
          statusUsuario: 'ATIVO',
        },
      },
    }).as('getProfile');

    cy.visit('/profile.html');
    cy.wait('@getProfile');
    cy.get('#profile-form, form').should('exist');
  });

  it('exibe informacoes do usuario no perfil', () => {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 'user-1',
          email: 'admin@negocio.com',
          name: 'Admin User',
          statusUsuario: 'ATIVO',
        },
      },
    }).as('getProfile');

    cy.visit('/profile.html');
    cy.wait('@getProfile');
    
    cy.get('#user-name, #profile-name').should('have.value', 'Admin User');
    cy.get('#user-email, #profile-email').should('have.value', 'admin@negocio.com');
  });

  it('atualiza nome do perfil', () => {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 'user-1',
          email: 'admin@negocio.com',
          name: 'Admin User',
          statusUsuario: 'ATIVO',
        },
      },
    }).as('getProfile');

    cy.intercept('PUT', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 'user-1',
          email: 'admin@negocio.com',
          name: 'Admin Atualizado',
          statusUsuario: 'ATIVO',
        },
      },
    }).as('updateProfile');

    cy.visit('/profile.html');
    cy.wait('@getProfile');
    
    cy.get('#user-name, #profile-name').clear().type('Admin Atualizado');
    cy.get('#profile-submit, #save-btn').click();
    
    cy.wait('@updateProfile');
    cy.get('.notification.is-success, #profile-message').should('be.visible');
  });

  it('valida email duplicado ao atualizar perfil', () => {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 'user-1',
          email: 'admin@negocio.com',
          name: 'Admin User',
        },
      },
    }).as('getProfile');

    cy.intercept('PUT', '**/api/auth/me', {
      statusCode: 409,
      body: { error: 'E-mail já está em uso' },
    }).as('updateDuplicate');

    cy.visit('/profile.html');
    cy.wait('@getProfile');
    
    cy.get('#user-email, #profile-email').clear().type('existente@teste.com');
    cy.get('#profile-submit, #save-btn').click();
    
    cy.wait('@updateDuplicate');
    cy.get('.notification.is-danger, #profile-error').should('be.visible').and('contain', 'já está em uso');
  });

  it('altera senha com validacao forte', () => {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 'user-1',
          email: 'admin@negocio.com',
          name: 'Admin User',
        },
      },
    }).as('getProfile');

    cy.intercept('POST', '**/api/auth/change-password', {
      statusCode: 200,
      body: { message: 'Senha atualizada com sucesso.' },
    }).as('changePassword');

    cy.visit('/profile.html');
    cy.wait('@getProfile');
    
    cy.get('#current-password, #old-password').type('Admin@123!');
    cy.get('#new-password').type('NovaSenha@123!');
    cy.get('#confirm-password, #new-password-confirm').type('NovaSenha@123!');
    cy.get('#change-password-submit, #password-submit').click();
    
    cy.wait('@changePassword');
    cy.get('.notification.is-success').should('be.visible');
  });

  it('valida senha atual incorreta na troca de senha', () => {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 'user-1',
          email: 'admin@negocio.com',
          name: 'Admin User',
        },
      },
    }).as('getProfile');

    cy.intercept('POST', '**/api/auth/change-password', {
      statusCode: 400,
      body: { error: 'Senha atual incorreta' },
    }).as('changePasswordError');

    cy.visit('/profile.html');
    cy.wait('@getProfile');
    
    cy.get('#current-password, #old-password').type('SenhaErrada@123!');
    cy.get('#new-password').type('NovaSenha@123!');
    cy.get('#confirm-password, #new-password-confirm').type('NovaSenha@123!');
    cy.get('#change-password-submit, #password-submit').click();
    
    cy.wait('@changePasswordError');
    cy.get('.notification.is-danger').should('be.visible').and('contain', 'incorreta');
  });

  it('valida nova senha fraca na troca de senha', () => {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 'user-1',
          email: 'admin@negocio.com',
          name: 'Admin User',
        },
      },
    }).as('getProfile');

    cy.visit('/profile.html');
    cy.wait('@getProfile');
    
    cy.get('#current-password, #old-password').type('Admin@123!');
    cy.get('#new-password').type('senha123');
    cy.get('#new-password').blur();
    cy.get('.help.is-danger').should('be.visible').and('contain', 'maiúscula, minúscula, número e caractere especial');
  });

  it('valida confirmacao de senha na troca', () => {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 'user-1',
          email: 'admin@negocio.com',
          name: 'Admin User',
        },
      },
    }).as('getProfile');

    cy.visit('/profile.html');
    cy.wait('@getProfile');
    
    cy.get('#current-password, #old-password').type('Admin@123!');
    cy.get('#new-password').type('NovaSenha@123!');
    cy.get('#confirm-password, #new-password-confirm').type('SenhaDiferente@123!');
    cy.get('#confirm-password, #new-password-confirm').blur();
    cy.get('.help.is-danger').should('be.visible').and('contain', 'não coincidem');
  });

  it('mostra status do usuario no perfil', () => {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 'user-1',
          email: 'admin@negocio.com',
          name: 'Admin User',
          statusUsuario: 'ATIVO',
          dataUltimoLogin: '2025-01-27T10:00:00Z',
          tentativasFalha: 0,
        },
      },
    }).as('getProfile');

    cy.visit('/profile.html');
    cy.wait('@getProfile');
    
    cy.get('#user-status, #status-display').should('contain', 'ATIVO');
  });
});
