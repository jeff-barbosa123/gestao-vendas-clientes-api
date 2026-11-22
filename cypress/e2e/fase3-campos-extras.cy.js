// Fase 3: campos extras por empresa (produto/cliente), com a API real.
describe('SGVC - Fase 3: campos extras (API real)', () => {
  it('FASE3-E2E-001 | dono configura campos em Aparencia e eles aparecem/gravam em produto e cliente', () => {
    cy.createRealUser('f3dono').then((dono) => {
      cy.loginReal(dono);
      const nome = `Produto F3 ${Date.now()}`;

      // Configura 2 campos de produto pela tela de Aparencia.
      cy.visit('/appearance.html');
      cy.get('#custom-fields-card .cf-section[data-entity="product"] .cf-add', { timeout: 10000 }).click();
      cy.get('#custom-fields-card .cf-section[data-entity="product"] .cf-label').last().type('Tamanho');
      cy.get('#custom-fields-card .cf-section[data-entity="product"] .cf-type').last().select('select');
      cy.get('#custom-fields-card .cf-section[data-entity="product"] .cf-options').last().type('P, M, G');
      cy.get('#custom-fields-card .cf-section[data-entity="product"] .cf-add').click();
      cy.get('#custom-fields-card .cf-section[data-entity="product"] .cf-label').last().type('Validade');
      cy.get('#custom-fields-card .cf-section[data-entity="product"] .cf-type').last().select('date');
      cy.get('#custom-fields-card .cf-section[data-entity="product"] .cf-save').click();
      cy.get('#custom-fields-card .cf-section[data-entity="product"] .cf-message').should('contain', 'Campos salvos');

      // Campo de cliente com validacao do servidor (opcoes insuficientes).
      cy.get('#custom-fields-card .cf-section[data-entity="customer"] .cf-add').click();
      cy.get('#custom-fields-card .cf-section[data-entity="customer"] .cf-label').last().type('Pet');
      cy.get('#custom-fields-card .cf-section[data-entity="customer"] .cf-type').last().select('select');
      cy.get('#custom-fields-card .cf-section[data-entity="customer"] .cf-save').click();
      cy.get('#custom-fields-card .cf-section[data-entity="customer"] .cf-message').should('have.class', 'is-error');

      // Cria produto (via API) e edita pela tela com os campos extras.
      cy.apiReal('POST', '/api/products', { name: nome, price: 50, purchase_price: 20, stock: 5 }).then((res) => {
        const id = res.body.id;
        cy.visit(`/product-edit.html?id=${id}`);
        cy.get('[data-cf-block="product"]', { timeout: 10000 }).should('exist');
        cy.get('[data-cf-block="product"] select').select('M');
        cy.get('[data-cf-block="product"] input[type="date"]').type('2027-03-15');
        cy.get('#save-btn').click();
        cy.contains(/Produto atualizado/i, { timeout: 10000 }).should('exist');
        cy.apiReal('GET', `/api/products/${id}`).its('body.extra').should('deep.equal', { tamanho: 'M', validade: '2027-03-15' });

        // Recarregar a tela mostra os valores salvos.
        cy.reload();
        cy.get('[data-cf-block="product"] select', { timeout: 10000 }).should('have.value', 'M');
        cy.get('[data-cf-block="product"] input[type="date"]').should('have.value', '2027-03-15');
      });
    });
  });

  it('FASE3-E2E-002 | edicao de cliente grava campos extras (texto e Sim/Nao)', () => {
    cy.createRealUser('f3cli').then((dono) => {
      cy.loginReal(dono);
      cy.apiReal('PUT', '/api/custom-fields/customer', {
        fields: [{ label: 'Instagram', type: 'text' }, { label: 'Aceita novidades', type: 'boolean' }],
      }).its('status').should('eq', 200);
      cy.apiReal('POST', '/api/customers', { name: 'Cliente Extra', email: `extra.${Date.now()}@sgvc-e2e.test`, phone: '11999999999', addressStreet: 'Rua das Flores', addressNumber: '10' }).then((res) => {
        const id = res.body.id;
        cy.visit(`/client-edit.html?id=${id}`);
        cy.get('[data-cf-block="customer"]', { timeout: 10000 }).should('exist');
        cy.get('[data-cf-block="customer"] input[type="text"]').type('@cliente_extra');
        cy.get('[data-cf-block="customer"] input[type="checkbox"]').check();
        cy.get('#save-btn').should('not.be.disabled').click();
        cy.get('#edit-message', { timeout: 10000 }).should('contain.text', 'atualizado');
        cy.apiReal('GET', `/api/customers/${id}`).its('body.extra').should('deep.equal', { instagram: '@cliente_extra', aceita_novidades: true });
      });
    });
  });
});
