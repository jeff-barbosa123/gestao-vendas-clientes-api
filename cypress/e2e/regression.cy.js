const regressionCustomer = {
  id: 'regressao-01',
  name: 'Regressao Flow',
  email: 'regressao@teste.com',
  phone: '(11) 97770-7777',
  birth_date: '1990-01-01',
  addressStreet: 'Rua Regiao',
  addressNumber: '1',
  addressNeighborhood: 'Centro',
  addressCity: 'Sao Paulo',
  addressPostalCode: '01001000',
  notes: 'Fluxo de regressao',
};

const sampleCustomer = {
  id: 'c1',
  name: 'Aline Fidelis',
  email: 'aline@lojaviva.com',
  phone: '(11) 98888-1111',
  birth_date: '1988-06-17',
  addressStreet: 'Rua Central',
  addressNumber: '100',
  addressNeighborhood: 'Marina',
  addressCity: 'Sao Paulo',
  addressPostalCode: '01001000',
  cnpj: '12345678909',
  notes: 'Cliente fiel',
};

const openClientsPage = (options = {}) => {
  cy.stubDashboardMetrics();
  cy.stubCustomerList(options);
  cy.loginAsAdmin();
  cy.openClientsFromDashboard();
  cy.wait('@customersList');
};

const fillBasicClientData = (overrides = {}) => {
  const base = {
    type: 'PF',
    name: 'Regressao Flow',
    email: 'regressao@teste.com',
    phone: '(11) 97770-7777',
    cpf: '12345678901',
    birthDate: '1990-01-01',
  };
  const data = { ...base, ...overrides };
  cy.get('#create-type').select('PF', { force: true });
  cy.get('#create-name').clear().type(data.name);
  cy.get('#create-email').clear().type(data.email);
  cy.get('#create-phone').clear().type(data.phone);
  cy.get('#create-cpf').clear().type(data.cpf);
  cy.get('#create-birth-date').clear().type(data.birthDate);
};

describe('Regressao completa', () => {
  it('Criar -> Filtrar -> Editar -> Remover', () => {
    openClientsPage();
    cy.intercept('POST', '**/api/customers', {
      statusCode: 201,
      body: { id: 'regressao-01', name: 'Regressao Flow' },
    }).as('createRegression');
    // Depois de criar, a lista é recarregada e já traz o cliente novo
    cy.fixture('customers-list').then((items) => {
      cy.intercept({ method: 'GET', pathname: '/api/customers' }, [...items, regressionCustomer]).as('listAfterCreate');
    });
    fillBasicClientData();
    cy.get('#create-submit').click();
    cy.wait('@createRegression');
    cy.wait('@listAfterCreate');
    cy.get('#search-input').clear().type('Regressao Flow');
    cy.get('#clients-body tr').should('contain', 'Regressao Flow');
    cy.intercept('GET', '**/api/customers/regressao-01', regressionCustomer).as('loadRegression');
    cy.get('#clients-body .clients-name-link').contains('Regressao Flow').click();
    cy.wait('@loadRegression');
    cy.intercept('PUT', '**/api/customers/regressao-01', {
      statusCode: 200,
      body: { ...regressionCustomer, name: 'Regressao Flow Editado' },
    }).as('updateRegression');
    cy.get('#edit-name').clear().type('Regressao Flow Editado');
    cy.get('#save-btn').click();
    cy.wait('@updateRegression');
    cy.get('#delete-btn').click();
    cy.intercept('DELETE', '**/api/customers/regressao-01', { statusCode: 200 }).as('deleteRegression');
    cy.get('#delete-confirm').click();
    cy.wait('@deleteRegression');
  });

  it('Navegacao continua a partir do dashboard', () => {
    openClientsPage();
    cy.intercept('GET', '**/api/customers/c1', sampleCustomer).as('loadFirst');
    cy.get('#clients-body .clients-name-link').first().click();
    cy.wait('@loadFirst');
    cy.go('back');
    cy.get('#back-dashboard').click();
    cy.location('pathname').should('eq', '/dashboard.html');
    cy.get('#clients-manage-action').should('be.visible').click();
    cy.location('pathname').should('eq', '/clients.html');
  });

  it('Refresh multiplo realiza varias chamadas', () => {
    openClientsPage();
    cy.intercept({ method: 'GET', pathname: '/api/customers', times: 3 }, { fixture: 'customers-list.json' }).as('multiRefresh');
    cy.get('#refresh-list').click();
    cy.wait('@multiRefresh');
    cy.get('#refresh-list').click();
    cy.wait('@multiRefresh');
    cy.get('#refresh-list').click();
    cy.wait('@multiRefresh');
  });

  it('Logout e login acontecem sem quebrar o fluxo', () => {
    openClientsPage();
    cy.get('#back-dashboard').click();
    cy.intercept('POST', '**/api/auth/logout', { statusCode: 204 }).as('logout');
    cy.get('#logout-btn').click();
    cy.wait('@logout');
    cy.location('pathname').should('eq', '/');
    cy.window().then((win) => {
      // Verificar que sessionStorage foi limpo
      expect(win.sessionStorage.getItem('sgvc.session')).to.be.null;
    });
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
  });

  it('Atualizar lista reflete o conteudo esperado', () => {
    openClientsPage();
    cy.intercept({ method: 'GET', pathname: '/api/customers' }, { fixture: 'customers-list.json' }).as('refreshFull');
    cy.get('#refresh-list').click();
    cy.wait('@refreshFull');
    cy.get('#clients-total').should('contain', '(14)');
  });

  it('Estado consistente final existe apos fluxos', () => {
    openClientsPage();
    cy.get('#clients-body').should('contain', 'Aline Fidelis');
    cy.get('#clients-total').should('contain', '(14)');
    cy.get('#search-input').clear().type('Nina Flores');
    cy.get('#clients-body').should('contain', 'Nina Flores');
    cy.get('#search-input').clear();
    cy.get('#search-input').should('have.value', '');
  });
});
