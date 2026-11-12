// Tela de perfil com a API simulada. Seletores seguem o layout atual de profile.html.
describe('SGVC - Perfil do Usuario', () => {
  const user = {
    id: 'user-1',
    email: 'admin@negocio.com',
    name: 'Admin User',
    statusUsuario: 'ATIVO',
    dataUltimoLogin: '2026-11-10T13:45:00Z',
  };

  beforeEach(() => {
    cy.seedSession({ user });
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user } }).as('getProfile');
    cy.visit('/profile.html');
    cy.wait('@getProfile');
  });

  it('exibe informacoes do usuario', () => {
    cy.get('#profile-name-input').should('have.value', 'Admin User');
    cy.get('#profile-email-input').should('have.value', 'admin@negocio.com');
    cy.get('#profile-status').should('contain', 'ATIVO');
    cy.get('#profile-last-login').should('not.contain', '-').and('contain', '/2026');
  });

  it('atualiza nome do perfil e volta ao painel', () => {
    cy.intercept('PUT', '**/api/auth/me', (req) => {
      expect(req.body).to.deep.equal({ name: 'Admin Editado', email: 'admin@negocio.com' });
      req.reply({ statusCode: 200, body: { user: { ...user, name: 'Admin Editado' } } });
    }).as('updateProfile');
    cy.get('#profile-name-input').clear().type('Admin Editado');
    cy.get('#profile-submit').click();
    cy.wait('@updateProfile');
    cy.get('#profile-form-message').should('contain', 'Dados atualizados com sucesso.');
    cy.location('pathname', { timeout: 5000 }).should('eq', '/dashboard.html');
  });

  it('exige nome ao salvar o perfil', () => {
    cy.get('#profile-name-input').clear();
    cy.get('#profile-submit').click();
    cy.get('#profile-name-error').should('be.visible').and('contain', 'Informe o nome.');
  });

  it('mostra erro da API ao usar e-mail ja cadastrado', () => {
    cy.intercept('PUT', '**/api/auth/me', {
      statusCode: 409,
      body: { success: false, message: 'E-mail já cadastrado' },
    }).as('updateProfile');
    cy.get('#profile-email-input').clear().type('outro@negocio.com');
    cy.get('#profile-submit').click();
    cy.wait('@updateProfile');
    cy.get('#profile-form-message').should('be.visible').and('contain', 'E-mail já cadastrado');
  });

  it('altera a senha com senha forte', () => {
    cy.intercept('POST', '**/api/auth/change-password', (req) => {
      expect(req.body).to.deep.equal({ currentPassword: 'Admin@123!', newPassword: 'Nova@Senha456' });
      req.reply({ statusCode: 200, body: { success: true } });
    }).as('changePassword');
    cy.get('#current-password').type('Admin@123!');
    cy.get('#new-password').type('Nova@Senha456');
    cy.get('#confirm-password').type('Nova@Senha456');
    cy.get('#password-submit').click();
    cy.wait('@changePassword');
    cy.get('#password-message').should('contain', 'Senha atualizada com sucesso.');
    cy.get('#new-password').should('have.value', '');
  });

  it('mostra erro quando a senha atual esta incorreta', () => {
    cy.intercept('POST', '**/api/auth/change-password', {
      statusCode: 400,
      body: { success: false, message: 'Senha atual incorreta' },
    }).as('changePassword');
    cy.get('#current-password').type('Errada@123');
    cy.get('#new-password').type('Nova@Senha456');
    cy.get('#confirm-password').type('Nova@Senha456');
    cy.get('#password-submit').click();
    cy.wait('@changePassword');
    cy.get('#password-message').should('be.visible').and('contain', 'Senha atual incorreta');
  });

  it('recusa nova senha fraca antes de chamar a API', () => {
    cy.intercept('POST', '**/api/auth/change-password', cy.spy().as('changeSpy'));
    cy.get('#current-password').type('Admin@123!');
    cy.get('#new-password').type('senhafraca1');
    cy.get('#confirm-password').type('senhafraca1');
    // As regras ficam visíveis e o botão só libera quando todas são atendidas
    cy.get('#profile-password-rules').should('be.visible');
    cy.get('#password-submit').should('be.disabled');
    cy.get('#new-password').clear().type('Senha@Forte1');
    cy.get('#confirm-password').clear().type('Senha@Forte1');
    cy.get('#password-submit').should('not.be.disabled');
    cy.get('@changeSpy').should('not.have.been.called');
  });

  it('recusa confirmacao diferente', () => {
    cy.get('#current-password').type('Admin@123!');
    cy.get('#new-password').type('Nova@Senha456');
    cy.get('#confirm-password').type('Outra@Senha456');
    cy.get('#password-submit').click();
    cy.get('#confirm-password-error').should('be.visible').and('contain', 'As senhas não conferem.');
  });
});
