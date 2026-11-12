describe('SGVC - Fichas de custo', () => {
  const placeholderText = 'Preencha os dados acima';

  const addSampleIngredient = () => {
    cy.get('#ingredient-advanced-toggle').click();
    cy.get('#ingredient-name').clear().type('Farinha de trigo');
    cy.get('#ingredient-qty').clear().type('100');
    cy.get('#ingredient-unit').select('g');
    cy.get('#ingredient-pack-unit').select('g');
    cy.get('#ingredient-pack').clear().type('1000');
    cy.get('#ingredient-cost').clear().type('20');
    cy.get('#add-ingredient').click();
  };

  const prepareRecipeForm = (name = 'Bolo Teste', yieldValue = '5') => {
    cy.get('#create-name').clear().type(name);
    cy.get('#create-yield').clear().type(yieldValue);
    addSampleIngredient();
  };

  beforeEach(() => {
    cy.intercept({ method: 'GET', url: '**/api/recipes' }, { fixture: 'recipes-list.json' }).as('fetchRecipes');
    cy.intercept({ method: 'POST', url: '**/api/recipes' }, (req) => {
      req.reply({ statusCode: 201, body: { id: 'recipe-test' } });
    }).as('createRecipe');
    cy.visitWithSession('/recipes.html');
    cy.wait('@fetchRecipes');
  });

  it('mantém o resumo com placeholder até que os dados estejam completos', () => {
    cy.get('#summary-total').should('contain', placeholderText);
    cy.get('#create-calc-status').should('contain', 'Faltam informações');
    cy.get('#create-submit').should('be.disabled');
    prepareRecipeForm();
    cy.get('#summary-total').should('not.contain', placeholderText);
    cy.get('#create-submit').should('not.be.disabled');
    cy.get('#create-calc-status').should('contain', 'Dados suficientes para calcular.');
  });

  it('bloqueia o salvamento quando o rendimento está vazio', () => {
    cy.get('#create-name').type('Bolo sem rendimento');
    addSampleIngredient();
    cy.get('#create-form').submit();
    cy.get('#create-yield-error').should('contain', 'Informe um rendimento maior que zero.');
    cy.get('#create-calc-status').should('contain', 'rendimento');
    cy.get('#create-submit').should('be.disabled');
  });

  it('aplica o limite de 15% nos gastos do dia a dia', () => {
    prepareRecipeForm('Bolo limite');
    cy.get('#create-overhead').clear().type('20');
    cy.get('#create-overhead-warning').should('be.visible').and('contain', 'o cálculo usa 15%');
    cy.get('#create-profit-fixed').clear().type('10'); // o resumo só aparece com o lucro informado
    cy.get('#summary-overhead-label').should('contain', '15%');
    cy.get('#summary-overhead').should('contain', 'R$ 0,30');
  });

  it('salva a ficha com payload completo e mostra mensagem de sucesso', () => {
    prepareRecipeForm('Bolo completo');
    cy.get('#create-submit').click();
    cy.wait('@createRecipe').its('request.body').should((body) => {
      expect(body).to.have.property('name', 'Bolo completo');
      expect(body).to.have.property('yield', 5);
      expect(body.ingredients).to.have.length(1);
      expect(body.ingredients[0]).to.include({
        name: 'Farinha de trigo',
        unit: 'g',
      });
    });
    cy.wait('@fetchRecipes');
    cy.get('#recipes-message').should('contain', 'Ficha técnica salva com sucesso.');
    cy.get('#create-name').should('have.value', '');
  });
});
