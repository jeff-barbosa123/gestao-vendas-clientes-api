const defaultCustomer = {
  id: 'c3',
  name: 'Carlos Paraiso',
  email: 'carlos@paraiso.com',
  phone: '(41) 98888-3333',
  birth_date: '1979-03-15',
  addressStreet: 'Rua Paraiso',
  addressNumber: '10',
  addressNeighborhood: 'Centro',
  addressCity: 'Curitiba',
  addressPostalCode: '80000000',
  cnpj: '11222333000112',
  notes: 'Cliente especial',
};

const openEditPage = (customerId = defaultCustomer.id, customer = defaultCustomer) => {
  cy.clearSession();
  cy.seedSession();
  cy.intercept('GET', `**/api/customers/${customerId}`, customer).as('loadCustomer');
  cy.visit(`/client-edit.html?id=${customerId}`);
  cy.wait('@loadCustomer');
};

const stubCustomerUpdate = (customerId = defaultCustomer.id, response = null) => {
  const targetId = customerId ?? defaultCustomer.id;
  cy.intercept('PUT', `**/api/customers/${targetId}`, (req) => {
    req.reply({
      statusCode: 200,
      body: response || { ...req.body, id: targetId },
    });
  }).as('updateCustomer');
};

const stubCustomerDelete = (customerId = defaultCustomer.id, response = null) => {
  cy.intercept('DELETE', `**/api/customers/${customerId}`, {
    statusCode: 200,
    body: response || { id: customerId },
  }).as('deleteCustomer');
};

describe('Edicao e remocao de clientes', () => {
  beforeEach(() => {
    openEditPage();
  });

  describe('Edicao de cliente', () => {
    it('Abrir cliente vai para a pagina de edicao', () => {
      cy.location('pathname').should('eq', '/client-edit.html');
      cy.get('#edit-name').should('have.value', defaultCustomer.name);
    });

    it('Editar nome salva a alteracao', () => {
      stubCustomerUpdate();
      cy.get('#edit-name').clear().type('Carlos Atualizado');
      cy.get('#save-btn').click();
      cy.wait('@updateCustomer');
      cy.get('#edit-message').should('contain', 'Cliente atualizado com sucesso');
    });

    it('Editar telefone atualiza link do WhatsApp', () => {
      stubCustomerUpdate();
      cy.get('#edit-phone').clear().type('(41) 99999-0000');
      cy.get('#save-btn').click();
      cy.wait('@updateCustomer');
      cy.get('#edit-phone-whatsapp').should('have.attr', 'href').and('contain', 'wa.me/55');
    });

    it('Editar endereco reflete nos campos', () => {
      stubCustomerUpdate();
      cy.get('#edit-address-street').clear().type('Rua Nova');
      cy.get('#edit-address-number').clear().type('50');
      cy.get('#save-btn').click();
      cy.wait('@updateCustomer');
      cy.get('#edit-address-street').should('have.value', 'Rua Nova');
      cy.get('#edit-message').should('contain', 'Cliente atualizado com sucesso');
    });

    it('Editar observacoes preserva o texto', () => {
      stubCustomerUpdate();
      cy.get('#edit-notes').clear().type('Atualizacao das observacoes');
      cy.get('#save-btn').click();
      cy.wait('@updateCustomer');
      cy.get('#edit-notes').should('have.value', 'Atualizacao das observacoes');
    });

    it('Salvar alteracoes mostra o feedback certo', () => {
      stubCustomerUpdate();
      cy.get('#edit-name').clear().type('Carlos Feedback');
      cy.get('#save-btn').click();
      cy.wait('@updateCustomer');
      cy.get('#edit-message').should('contain', 'Cliente atualizado com sucesso');
      cy.get('#save-btn').should('not.have.class', 'is-loading');
    });

    it('Cancelar edicao retorna para lista', () => {
      cy.intercept({ method: 'GET', pathname: '/api/customers' }, { fixture: 'customers-list' }).as('clientsList');
      cy.get('#back-list').click();
      cy.wait('@clientsList');
      cy.location('pathname').should('eq', '/clients.html');
    });

    it('Persistencia apos reload mantem os dados', () => {
      stubCustomerUpdate(null, { ...defaultCustomer, name: 'Carlos Reload' });
      cy.get('#edit-name').clear().type('Carlos Reload');
      cy.get('#save-btn').click();
      cy.wait('@updateCustomer');
      cy.intercept('GET', `**/api/customers/${defaultCustomer.id}`, {
        ...defaultCustomer,
        name: 'Carlos Reload',
      }).as('loadAfterReload');
      cy.reload();
      cy.wait('@loadAfterReload');
      cy.get('#edit-name').should('have.value', 'Carlos Reload');
    });
  });

  describe('Remocao de cliente', () => {
    it('Remover cliente confirma redirecionamento', () => {
      stubCustomerDelete();
      cy.clock();
      cy.intercept({ method: 'GET', pathname: '/api/customers' }, { fixture: 'customers-list' }).as('clientsList');
      cy.get('#delete-btn').click();
      cy.get('#delete-confirm').click();
      cy.wait('@deleteCustomer');
      cy.tick(600);
      cy.wait('@clientsList');
      cy.location('pathname').should('eq', '/clients.html');
      cy.window()
        .its('sessionStorage')
        .invoke('getItem', 'sgvc.clientDeleted')
        .should('eq', 'true');
      cy.clock().then((clock) => clock.restore());
    });

    it('Cancelar remocao fecha o modal', () => {
      cy.get('#delete-btn').click();
      cy.get('#delete-cancel').click();
      cy.get('#delete-modal').should('have.attr', 'aria-hidden', 'true');
      cy.location('pathname').should('eq', '/client-edit.html');
    });

    it('Confirmar remocao mostra mensagem de sucesso', () => {
      stubCustomerDelete();
      cy.clock();
      cy.get('#delete-btn').click();
      cy.get('#delete-confirm').click();
      cy.wait('@deleteCustomer');
      cy.get('#edit-message').should('contain', 'Cliente removido com sucesso.');
      cy.tick(600);
      cy.clock().then((clock) => clock.restore());
    });

    it('Recarregar lista solicita os dados apos remocao', () => {
      cy.fixture('customers-list').then((items) => {
        const filtered = items.filter((customer) => customer.id !== defaultCustomer.id);
        cy.intercept({ method: 'GET', pathname: '/api/customers', times: 1 }, filtered).as('clientsAfterDelete');
        stubCustomerDelete();
        cy.clock();
        cy.get('#delete-btn').click();
        cy.get('#delete-confirm').click();
        cy.wait('@deleteCustomer');
        cy.tick(600);
        cy.wait('@clientsAfterDelete');
        cy.clock().then((clock) => clock.restore());
      });
    });

    it('Cliente nao reaparece na lista apos remocao', () => {
      cy.fixture('customers-list').then((items) => {
        const filtered = items.filter((customer) => customer.id !== defaultCustomer.id);
        cy.intercept({ method: 'GET', pathname: '/api/customers', times: 1 }, filtered).as('clientsAfterDelete');
        stubCustomerDelete();
        cy.clock();
        cy.get('#delete-btn').click();
        cy.get('#delete-confirm').click();
        cy.wait('@deleteCustomer');
        cy.tick(600);
        cy.wait('@clientsAfterDelete');
        cy.get('#clients-body').should('not.contain', defaultCustomer.name);
        cy.clock().then((clock) => clock.restore());
      });
    });

    it('Integridade da lista ajusta o total', () => {
      cy.fixture('customers-list').then((items) => {
        const filtered = items.filter((customer) => customer.id !== defaultCustomer.id);
        cy.intercept({ method: 'GET', pathname: '/api/customers', times: 1 }, filtered).as('clientsAfterDelete');
        stubCustomerDelete();
        cy.clock();
        cy.get('#delete-btn').click();
        cy.get('#delete-confirm').click();
        cy.wait('@deleteCustomer');
        cy.tick(600);
        cy.wait('@clientsAfterDelete');
        cy.get('#clients-total').should('contain', '(13)');
        cy.clock().then((clock) => clock.restore());
      });
    });
  });
});
