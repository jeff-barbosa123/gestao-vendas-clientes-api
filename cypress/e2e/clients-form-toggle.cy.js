// Clientes: cadastro recolhivel (aberto sem clientes, recolhido com clientes).
describe('SGVC - Clientes: formulario de cadastro recolhivel', () => {
  const open = (list) => {
    cy.stubDashboardMetrics();
    cy.stubCustomerList(list ? { statusCode: 200, response: { body: list }, alias: 'customersList' } : {});
    cy.loginAsAdmin();
    cy.openClientsFromDashboard();
    cy.wait('@customersList');
  };

  it('CLITOG-001 | com clientes: recolhido; botao abre e fecha e leva o foco ao nome', () => {
    open();
    cy.get('#clients-form-toggle').should('be.visible').and('have.attr', 'aria-expanded', 'false').and('contain', 'Novo cliente');
    cy.get('#create-form').should('not.be.visible');
    cy.get('#clients-form-toggle').click().should('have.attr', 'aria-expanded', 'true').and('contain', 'Fechar cadastro');
    cy.get('#create-form').should('be.visible');
    cy.focused().should('have.attr', 'id', 'create-name');
    cy.get('#clients-form-toggle').click().should('have.attr', 'aria-expanded', 'false');
    cy.get('#create-form').should('not.be.visible');
  });

  it('CLITOG-002 | sem clientes: ja nasce aberto e o estado vazio leva ao campo nome', () => {
    open([]);
    cy.get('#clients-form-toggle').should('have.attr', 'aria-expanded', 'true');
    cy.get('#create-form').should('be.visible');
    cy.get('#clients-body [data-empty-state="none"]').should('contain', 'Nenhum cliente cadastrado ainda');
    cy.get('#clients-body [data-empty-focus]').click();
    cy.focused().should('have.attr', 'id', 'create-name');
  });

  it('CLITOG-003 | escolha manual nao e sobrescrita ao atualizar a lista', () => {
    open();
    cy.get('#clients-form-toggle').click();
    cy.get('#refresh-list').click();
    cy.get('#create-form').should('be.visible');
    cy.get('#clients-form-toggle').should('have.attr', 'aria-expanded', 'true');
  });
});
