// Financeiro: ajudas no formulario, categoria consistente e abas com aria-selected.
describe('SGVC - Financeiro: clareza do formulario', () => {
  const today = () => new Date().toISOString().slice(0, 10);
  let dono;
  before(() => {
    cy.createRealUser('fin-clareza').then((u) => { dono = u; });
  });
  beforeEach(() => {
    cy.loginReal(dono);
    cy.visit('/finance.html');
    cy.get('#fin-form', { timeout: 10000 }).should('be.visible');
  });

  const lanca = (desc, cat) => {
    cy.get('#f-desc').clear().type(desc);
    cy.get('#f-amount').clear().type('10');
    cy.get('#f-due').type(today());
    cy.get('#f-cat').clear().type(cat);
    cy.get('#fin-form button[type="submit"]').click();
    cy.get('#fin-message').should('contain', 'criado');
  };

  it('FINCLARO-001 | campos com placeholder e ajuda; vencimento explica a 1a parcela', () => {
    cy.get('#f-desc').should('have.attr', 'placeholder').and('not.be.empty');
    cy.get('#f-amount').should('have.attr', 'placeholder').and('not.be.empty');
    cy.get('#f-due-help').should('be.visible').and('contain', '1ª').and('contain', 'parcela');
    cy.get('#f-due').should('have.attr', 'aria-describedby', 'f-due-help');
    cy.get('#f-inst-help').should('contain', 'à vista');
    cy.get('#f-amount-help').should('contain', 'dividido');
    cy.get('#f-cat-help').should('contain', 'DRE');
  });

  it('FINCLARO-002 | categoria: sugestoes e grafia unica (caixa, acento e espacos)', () => {
    cy.get('#f-cat-list option').should('have.length.at.least', 5);
    lanca(`Luz A ${Date.now()}`, 'Energia');
    lanca(`Luz B ${Date.now()}`, '  energia ');
    lanca(`Luz C ${Date.now()}`, 'ENERGIA');
    cy.apiReal('GET', '/api/finance/entries').then((r) => {
      const cats = [...new Set(r.body.entries.map((e) => e.category))];
      expect(cats).to.deep.equal(['Energia']);
    });
  });

  it('FINCLARO-003 | abas usam aria-selected (sem aria-pressed) e alternam', () => {
    cy.get('.fin-tabs button').each(($b) => {
      expect($b.attr('aria-pressed')).to.be.undefined;
    });
    cy.get('.fin-tabs button[data-tab="entries"]').should('have.attr', 'aria-selected', 'true');
    cy.get('.fin-tabs button[data-tab="dre"]').click().should('have.attr', 'aria-selected', 'true');
    cy.get('.fin-tabs button[data-tab="entries"]').should('have.attr', 'aria-selected', 'false');
  });
});
