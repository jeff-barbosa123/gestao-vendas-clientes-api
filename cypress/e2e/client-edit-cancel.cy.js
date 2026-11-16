// O botao Cancelar deve respeitar a confirmacao de alteracoes nao salvas
// (antes, um segundo listener redirecionava para a lista mesmo quando o usuario recusava).
describe('SGVC - Edicao de cliente: cancelar com alteracoes pendentes', () => {
  const customer = { id: 'c3', name: 'Carlos Paraiso', email: 'carlos@paraiso.com', phone: '(41) 98888-3333', cnpj: '11222333000112' };

  const open = () => {
    cy.clearSession();
    cy.seedSession();
    cy.intercept('GET', '**/api/customers/c3', customer).as('loadCustomer');
    cy.visit('/client-edit.html?id=c3', {
      onBeforeLoad(win) {
        cy.stub(win, 'confirm').as('confirm');
      },
    });
    cy.wait('@loadCustomer');
    cy.get('#edit-name').should('have.value', customer.name);
  };

  it('recusar a confirmacao mantem o usuario na pagina com as alteracoes', () => {
    open();
    cy.get('@confirm').invoke('returns', false);
    cy.get('#edit-name').type(' Jr');
    cy.get('#cancel-edit').click();
    cy.get('@confirm').should('have.been.calledOnce');
    cy.wait(600);
    cy.location('pathname').should('eq', '/client-edit.html');
    cy.get('#edit-name').should('have.value', `${customer.name} Jr`);
  });

  it('aceitar a confirmacao volta para a lista', () => {
    open();
    cy.get('@confirm').invoke('returns', true);
    cy.get('#edit-name').type(' Jr');
    cy.get('#cancel-edit').click();
    cy.get('@confirm').should('have.been.calledOnce');
    cy.location('pathname').should('eq', '/clients.html');
  });

  it('sem alteracoes volta para a lista sem pedir confirmacao', () => {
    open();
    cy.get('#cancel-edit').click();
    cy.location('pathname').should('eq', '/clients.html');
    cy.get('@confirm').should('not.have.been.called');
  });
});
