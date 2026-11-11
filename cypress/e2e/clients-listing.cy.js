const openClientsPage = (customerOptions = {}) => {
  cy.stubDashboardMetrics();
  cy.stubCustomerList(customerOptions);
  cy.loginAsAdmin();
  cy.openClientsFromDashboard();
  cy.wait('@customersList');
};

describe('Listagem, filtros e ordenacao de clientes', () => {
  beforeEach(() => {
    openClientsPage();
  });

  describe('Listagem de clientes', () => {
    it('Carrega a lista com linhas suficientes', () => {
      cy.get('#clients-body tr.clients-row').should('have.length', 10);
    });

    it('Mostra o total correto', () => {
      cy.get('#clients-total').should('contain', '(14)');
    });

    it('Exibe a paginacao', () => {
      cy.get('#clients-pagination').should('not.be.hidden');
    });

    it('Permite ir para pagina especifica', () => {
      cy.get('#page-jump-input').clear().type('2');
      cy.get('#page-jump-btn').click();
      cy.get('#page-info').should('contain', '11-14');
      cy.get('#clients-body tr').first().should('contain', 'Karla Rosa');
    });

    it('Avanca para proxima pagina', () => {
      cy.get('#next-page').click();
      cy.get('#clients-body tr').first().should('contain', 'Karla Rosa');
    });

    it('Retorna para a pagina anterior', () => {
      cy.get('#next-page').click();
      cy.get('#prev-page').click();
      cy.get('#clients-body tr').first().should('contain', 'Aline Fidelis');
    });

    it('Permite scroll horizontal', () => {
      cy.get('.table-container').scrollTo('right');
      cy.get('.table-container').should(($el) => {
        expect($el[0].scrollLeft).to.be.greaterThan(0);
      });
    });

    it('Permite scroll vertical', () => {
      cy.get('.table-container').scrollTo('bottom');
      cy.get('.table-container').should(($el) => {
        expect($el[0].scrollTop).to.be.greaterThan(0);
      });
    });

    it('Mantem colunas visiveis', () => {
      cy.get('#clients-table th').should('have.length.at.least', 6);
      cy.get('#name-header').should('be.visible');
      cy.get('#spent-header').should('be.visible');
    });

    it('Dados exibidos sao consistentes com o backend', () => {
      cy.get('#clients-body tr.clients-row').first().within(() => {
        cy.contains('Aline Fidelis');
        cy.contains('R$ 2.100,00');
      });
    });
  });

  describe('Filtros', () => {
    it('Filtro Todos e o padrao', () => {
      cy.get('[data-filter="all"]').should('have.class', 'is-active').and('have.attr', 'aria-pressed', 'true');
    });

    it('Filtro Fieis mostra clientes com tags apropriadas', () => {
      cy.get('[data-filter="loyal"]').click();
      cy.get('[data-filter="loyal"]').should('have.class', 'is-active');
      cy.contains('.client-tag', /Fiel|Frequente/).should('exist');
    });

    it('Filtro Aniversariantes destaca proximos aniversariantes', () => {
      cy.clock(new Date('2025-06-15').getTime(), ['Date']);
      cy.intercept({ method: 'GET', url: '**/api/customers', times: 1 }, (req) => {
        req.reply({ fixture: 'customers-list.json' });
      }).as('birthdayReload');
      cy.reload();
      cy.wait('@birthdayReload');
      cy.get('[data-filter="birthdays"]').click();
      cy.get('#birthday-insight').should('contain', 'Aniversariantes nos proximos 7 dias');
      cy.get('.birthday-badge').should('exist');
      cy.clock().then((clock) => clock.restore());
    });

    it('Filtro Novos destaca clientes recentes', () => {
      cy.get('[data-filter="new"]').click();
      cy.contains('.client-tag', 'Novo').should('exist');
    });

    it('Filtro Antigos destaca clientes antigos', () => {
      cy.get('[data-filter="old"]').click();
      cy.contains('.client-tag', 'Antigo').should('exist');
    });

    it('Combina filtro e busca', () => {
      cy.get('[data-filter="loyal"]').click();
      cy.get('#search-input').clear().type('Carlos');
      cy.get('#clients-body tr').should('contain', 'Carlos Paraiso');
      cy.get('[data-filter="loyal"]').should('have.class', 'is-active');
    });

    it('Buscar por nome localiza o cliente', () => {
      cy.get('#search-input').clear().type('Aline');
      cy.get('#clients-body tr').first().should('contain', 'Aline Fidelis');
    });

    it('Buscar por email localiza o cliente', () => {
      cy.get('#search-input').clear().type('karla@rosa.com');
      cy.get('#clients-body tr').first().should('contain', 'Karla Rosa');
    });

    it('Busca parcial encontra matches parciais', () => {
      cy.get('#search-input').clear().type('Flo');
      cy.get('#clients-body tr').first().should('contain', 'Nina Flores');
    });

    it('Busca inexistente mostra mensagem', () => {
      cy.get('#search-input').clear().type('XYZXYZ');
      cy.get('#clients-body').should('contain', 'Nenhum cliente encontrado');
    });

    it('Limpar busca restaura a lista completa', () => {
      cy.get('#search-input').clear().type('Aline');
      cy.get('#search-input').clear();
      cy.get('#clients-total').should('contain', '(14)');
    });

    it('Persistencia do filtro apos refresh', () => {
      cy.get('[data-filter="loyal"]').click();
      cy.intercept({ method: 'GET', url: '**/api/customers', times: 1 }, { fixture: 'customers-list.json' }).as('refreshFilter');
      cy.get('#refresh-list').click();
      cy.wait('@refreshFilter');
      cy.get('[data-filter="loyal"]').should('have.class', 'is-active').and('have.attr', 'aria-pressed', 'true');
    });

    it('Atualizar lista com filtro ativo mantem o criterio', () => {
      cy.get('[data-filter="loyal"]').click();
      cy.intercept({ method: 'GET', url: '**/api/customers', times: 1 }, { fixture: 'customers-list.json' }).as('refreshFilterActive');
      cy.get('#refresh-list').click();
      cy.wait('@refreshFilterActive');
      cy.contains('.client-tag', /Fiel|Frequente/).should('exist');
    });

    it('Performance com carga lenta nao bloqueia a lista', () => {
      cy.intercept({ method: 'GET', url: '**/api/customers', times: 1 }, (req) => {
        req.reply({ fixture: 'customers-list.json', delay: 1200 });
      }).as('slowLoad');
      cy.reload();
      cy.wait('@slowLoad');
      cy.get('#clients-body tr').should('have.length.at.least', 1);
    });

    it('Filtro reseta apos reload', () => {
      cy.get('[data-filter="loyal"]').click();
      cy.intercept({ method: 'GET', url: '**/api/customers', times: 1 }, { fixture: 'customers-list.json' }).as('reloadFilter');
      cy.reload();
      cy.wait('@reloadFilter');
      cy.get('[data-filter="all"]').should('have.class', 'is-active');
    });
  });

  describe('Ordenacao', () => {
    it('Ordenar A-Z mantém a ordem alfabetica', () => {
      cy.get('#clients-body tr').first().should('contain', 'Aline Fidelis');
    });

    it('Ordenar Z-A inverte a ordem', () => {
      cy.get('#name-header').click();
      cy.get('#clients-body tr').first().should('contain', 'Nina Flores');
    });

    it('Ordenar com filtro ativo continua aplicando o filtro', () => {
      cy.get('[data-filter="loyal"]').click();
      cy.get('#name-header').click();
      cy.get('#clients-body tr').first().should('contain', 'Carlos Paraiso');
      cy.contains('.client-tag', /Fiel|Frequente/).should('exist');
    });

    it('Ordenar apos refresh de dados contem o novo resultado', () => {
      cy.fixture('customers-list').then((items) => {
        const updated = items.map((customer) =>
          customer.id === 'c3' ? { ...customer, name: 'Zeta Paraiso' } : customer
        );
        cy.intercept({ method: 'GET', url: '**/api/customers', times: 1 }, updated).as('reordered');
        cy.get('#refresh-list').click();
        cy.wait('@reordered');
        cy.get('#name-header').click();
        cy.get('#clients-body tr').first().should('contain', 'Zeta Paraiso');
      });
    });

    it('Consistencia da ordem ao alternar criterios', () => {
      cy.get('#name-header').click();
      cy.get('#name-header').click();
      cy.get('#clients-body tr').first().should('contain', 'Aline Fidelis');
      cy.get('#spent-header').click();
      cy.get('#clients-body tr').first().should('contain', 'Carlos Paraiso');
    });
  });
});
