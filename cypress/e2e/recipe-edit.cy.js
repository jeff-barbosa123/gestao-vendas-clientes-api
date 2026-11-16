describe('SGVC - Edição de ficha de custo', () => {
  const recipe = {
    id: 'rec-1',
    name: 'Bolo Teste',
    description: 'Receita base',
    yield: 10,
    yieldType: 'UN',
    overhead: 0,
    overheadItems: [],
    costIngredients: 2,
    costPerUnit: 0.2,
    priceSuggested: 0.4,
    ingredients: [
      { name: 'Farinha de trigo', quantity: 100, packageQuantity: 1000, cost: 20, unit: 'g', packUnit: 'g' },
    ],
  };

  const visitEdit = (query = '?id=rec-1') => {
    cy.intercept({ method: 'GET', url: '**/api/recipes/rec-1' }, { body: recipe }).as('getRecipe');
    cy.intercept({ method: 'GET', url: '**/api/ingredients*' }, { body: [] });
    cy.visitWithSession(`/recipe-edit.html${query}`);
  };

  it('carrega os dados da ficha nos campos e lista os ingredientes', () => {
    visitEdit();
    cy.wait('@getRecipe');
    cy.get('#edit-name').should('have.value', 'Bolo Teste');
    cy.get('#edit-yield').should('have.value', '10');
    cy.get('#edit-ingredients-body').should('contain', 'Farinha de trigo');
    cy.get('#summary-total').should('not.contain', 'Preencha os dados acima');
  });

  it('bloqueia o salvamento com nome inválido', () => {
    visitEdit();
    cy.wait('@getRecipe');
    cy.get('#edit-name').clear().type('ab');
    cy.get('#edit-form').submit();
    cy.get('#edit-name-error').should('contain', 'Informe um nome com pelo menos 3 letras.');
  });

  it('salva as alterações via PUT com o payload completo', () => {
    cy.intercept({ method: 'PUT', url: '**/api/recipes/rec-1' }, (req) => {
      req.reply({ statusCode: 200, body: { ...recipe, name: req.body.name } });
    }).as('updateRecipe');
    visitEdit();
    cy.wait('@getRecipe');
    cy.get('#edit-name').clear().type('Bolo Atualizado');
    cy.get('#edit-form').submit();
    cy.wait('@updateRecipe').its('request.body').should((body) => {
      expect(body.name).to.eq('Bolo Atualizado');
      expect(body.yield).to.eq(10);
      expect(body.ingredients).to.have.length(1);
      expect(body.ingredients[0].name).to.eq('Farinha de trigo');
    });
    cy.get('#edit-message').should('contain', 'Ficha de custo atualizada.');
  });

  it('abre e fecha o modal de exclusão', () => {
    visitEdit();
    cy.wait('@getRecipe');
    cy.get('#delete-btn').click();
    cy.get('#delete-modal').should('have.class', 'is-active');
    cy.get('#delete-cancel').click();
    cy.get('#delete-modal').should('not.have.class', 'is-active');
  });

  it('redireciona para a lista quando não há id na URL', () => {
    visitEdit('');
    cy.location('pathname').should('eq', '/recipes.html');
  });
});
