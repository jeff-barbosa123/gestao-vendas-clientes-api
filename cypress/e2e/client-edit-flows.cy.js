// Fluxos complementares da edicao de cliente (baseline antes da modularizacao de client-edit.js).
describe('SGVC - Edicao de cliente: fluxos complementares', () => {
  const customer = {
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

  beforeEach(() => {
    cy.clearSession();
    cy.seedSession();
    cy.intercept('GET', '**/api/customers/c3', customer).as('loadCustomer');
    cy.visit('/client-edit.html?id=c3');
    cy.wait('@loadCustomer');
    cy.get('#edit-name').should('have.value', customer.name);
  });

  it('botao Salvar so habilita apos alterar um campo', () => {
    cy.get('#save-btn').should('be.disabled');
    cy.get('#edit-name').type(' Jr');
    cy.get('#save-btn').should('not.be.disabled');
    cy.get('#edit-name').clear().type(customer.name);
    cy.get('#save-btn').should('be.disabled');
  });

  it('e-mail invalido mostra erro no blur e bloqueia o envio', () => {
    cy.intercept('PUT', '**/api/customers/c3', cy.spy().as('updateSpy'));
    cy.get('#edit-email').clear().type('email-invalido').blur();
    cy.get('#edit-email-error').should('be.visible').and('contain', 'e-mail');
    cy.get('#edit-form').submit();
    cy.get('@updateSpy').should('not.have.been.called');
  });

  it('atualiza o link do WhatsApp', () => {
    cy.get('#edit-phone').clear().type('(41) 99999-4444');
    cy.get('#edit-phone-whatsapp').invoke('attr', 'href').should('contain', '41999994444');
  });

  it('botao Voltar leva para a lista de clientes', () => {
    cy.get('#back-list').click();
    cy.location('pathname').should('eq', '/clients.html');
  });

  it('ESC fecha o modal de exclusao', () => {
    cy.get('#delete-btn').click();
    cy.get('#delete-modal').should('have.class', 'is-active');
    cy.get('body').type('{esc}');
    cy.get('#delete-modal').should('not.have.class', 'is-active');
  });

  it('exclusao dispara um unico DELETE', () => {
    let deletes = 0;
    cy.intercept('DELETE', '**/api/customers/c3', (req) => {
      deletes += 1;
      req.reply({ statusCode: 200, body: { id: 'c3' } });
    }).as('deleteCustomer');
    cy.get('#delete-btn').click();
    cy.get('#delete-confirm').click();
    cy.wait('@deleteCustomer');
    cy.wait(400).then(() => expect(deletes).to.eq(1));
  });
});
