describe('SGVC - Navegacao e dashboard', () => {
  const loginAndOpenClients = (listOptions = {}) => {
    cy.stubDashboardMetrics();
    cy.stubCustomerList(listOptions);
    cy.loginAsAdmin();
    cy.openClientsFromDashboard();
    cy.wait('@customersList');
  };

  it('Carrega o dashboard com os indicadores', () => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
    // toLocaleString usa espaço não separável entre R$ e o valor
    cy.get('#metric-revenue').invoke('text').should('match', /R\$\s18\.600,00/);
    cy.get('[data-empty="customers"]').should('have.class', 'is-hidden');
  });

  it('Indicadores ficam visiveis apos a carga', () => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
    ['#metric-customers', '#metric-sales', '#metric-revenue'].forEach((selector) => {
      cy.get(selector).should('be.visible');
    });
  });

  it('Botao Ver clientes esta habilitado', () => {
    cy.stubDashboardMetrics();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
    cy.get('#clients-manage-action').should('be.visible').and('not.be.disabled');
  });

  it('Clique unico leva para tela de clientes', () => {
    loginAndOpenClients();
    cy.location('pathname').should('eq', '/clients.html');
  });

  it('Clique duplo nao quebra a navegacao para clientes', () => {
    cy.stubDashboardMetrics();
    cy.stubCustomerList();
    cy.loginAsAdmin();
    cy.wait('@dashboardOverview');
    cy.get('#clients-manage-action').dblclick({ force: true });
    cy.wait('@customersList');
    cy.location('pathname').should('eq', '/clients.html');
  });

  it('Delay na API mantem a exibicao apos o carregamento', () => {
    cy.stubDashboardMetrics({ delay: 1500, alias: 'dashboardDelay' });
    cy.loginAsAdmin();
    cy.wait('@dashboardDelay');
    cy.get('#metric-customers').should('contain', '14');
  });

  it('Erro da API nao deixa cair a pagina', () => {
    cy.stubDashboardMetrics({ statusCode: 500, alias: 'dashboardError' });
    cy.loginAsAdmin();
    cy.wait('@dashboardError');
    cy.location('pathname').should('eq', '/dashboard.html');
    cy.get('#metric-customers').should('contain', '0');
  });

  it('Retorno seguro ao dashboard depois de visitar clientes', () => {
    loginAndOpenClients();
    cy.get('#back-dashboard').click();
    cy.location('pathname').should('eq', '/dashboard.html');
    cy.get('#metric-customers').should('contain', '14');
  });

  it('Acesso via URL direta mostra tela de clientes', () => {
    cy.stubCustomerList();
    cy.visitWithSession('/clients.html');
    cy.wait('@customersList');
    cy.get('#clients-body tr.clients-row').should('have.length.at.least', 1);
  });

  it('Reload da pagina recarrega a lista', () => {
    loginAndOpenClients();
    cy.intercept({ method: 'GET', pathname: '/api/customers', times: 1 }, (req) => {
      req.reply({ fixture: 'customers-list.json' });
    }).as('customersReload');
    cy.reload();
    cy.wait('@customersReload');
    cy.get('#clients-total').should('contain', '(14)');
  });

  it('Atualizar lista respeita o filtro atual', () => {
    loginAndOpenClients();
    cy.intercept({ method: 'GET', pathname: '/api/customers', times: 1 }, (req) => {
      req.reply({ fixture: 'customers-list.json' });
    }).as('refreshList');
    cy.get('#refresh-list').click();
    cy.wait('@refreshList');
    cy.get('#clients-total').should('contain', '(14)');
  });

  it('Browser back e forward mantem a rota ativa', () => {
    loginAndOpenClients();
    cy.go('back');
    cy.location('pathname').should('eq', '/dashboard.html');
    cy.go('forward');
    cy.location('pathname').should('eq', '/clients.html');
  });

  it('Estado vazio exibe mensagem de ausencia', () => {
    cy.stubDashboardMetrics();
    cy.stubCustomerList({ statusCode: 200, response: { body: [] }, alias: 'emptyList' });
    cy.loginAsAdmin();
    cy.openClientsFromDashboard();
    cy.wait('@emptyList');
    cy.get('#clients-body').should('contain', 'Nenhum cliente encontrado');
  });
});
