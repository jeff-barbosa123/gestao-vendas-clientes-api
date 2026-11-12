/**
 * Estoque de insumos contra o backend REAL.
 * Compra pela tela → mínimo → venda pela tela desconta pela ficha técnica → avisos de reposição.
 * Usa um usuário criado na hora (cy.createRealUser).
 */
describe('SGVC - Estoque de insumos (backend real)', () => {
  let user;
  const tag = Date.now();
  const insumo = `Leite condensado estoque ${tag}`;
  const produto = `Brigadeiro estoque ${tag}`;

  const login = () => cy.loginReal(user);
  const api = (method, url, body) => cy.apiReal(method, url, body);

  before(() => {
    cy.createRealUser('estoque').then((u) => {
      user = u;
    });
    cy.then(() => login());
    // Insumo + produto ligado a uma ficha que rende 20 unidades com 395 g do insumo
    api('POST', '/api/ingredients', { name: insumo, packageQuantity: 395, packageUnit: 'g', packageCost: 7.5 }).then(({ body: ing }) => {
      api('POST', '/api/products', { name: produto, price: 4, purchase_price: 1, stock: 1000 }).then(({ body: prod }) => {
        api('POST', '/api/recipes', {
          name: `Ficha ${produto}`,
          yield: 20,
          yieldType: 'UN',
          margin: 1.5,
          overhead: 0,
          labor: 0,
          linkProductId: prod.id,
          ingredients: [{ name: insumo, ingredientId: ing.id, quantity: 395, unit: 'g', packageQuantity: 395, packUnit: 'g', cost: 7.5 }],
        });
      });
    });
  });

  beforeEach(login);

  it('registra compra e mínimo pela janela de estoque', () => {
    cy.visit('/ingredients.html');
    cy.contains('#ing-tbody tr', insumo).within(() => {
      cy.contains('Sem controle');
      cy.get('[data-stock]').click();
    });
    cy.get('#stock-modal').should('be.visible');
    cy.get('#stock-current').should('contain', 'Sem controle de estoque');

    cy.get('#stock-purchase-qty').type('1');
    cy.get('#stock-purchase-unit').select('kg');
    cy.get('#stock-purchase-save').click();
    cy.get('#stock-current').should('contain', 'Em estoque: 1 kg');
    cy.get('#stock-moves').should('contain', 'Compra').and('contain', '+1 kg');

    cy.get('#stock-min-qty').clear().type('900');
    cy.get('#stock-min-save').click();
    cy.get('#stock-current').should('contain', 'aviso em 900 g');
    cy.get('[data-close-stock]').last().click();
    cy.get('#stock-modal').should('not.be.visible');
    cy.contains('#ing-tbody tr', insumo).should('contain', '1 kg');
  });

  it('venda pela tela desconta o insumo e avisa a reposição', () => {
    cy.visit('/sales.html');
    cy.get('#create-customer').type(`Cliente estoque ${tag}`);
    cy.contains('#item-product option', produto).then(($opt) => cy.get('#item-product').select($opt.val()));
    cy.get('#item-qty').clear().type('10'); // 10 x 395/20 = 197,5 g -> sobra 802,5 g (< 900 g)
    cy.get('#add-item').click();
    cy.get('#create-submit').click();
    cy.get('#sales-message').should('contain', 'Venda criada com sucesso').and('contain', insumo).and('contain', 'estoque mínimo');

    cy.visit('/ingredients.html');
    cy.get('#ing-low-banner').should('be.visible').and('contain', insumo);
    cy.contains('#ing-tbody tr', insumo).should('contain', '802,5 g').and('contain', 'Repor');

    cy.visit('/dashboard.html');
    cy.get('#alert-stock-list').should('contain', insumo).and('contain', '802,5 g');
    cy.get('#alert-stock-card').scrollIntoView().screenshot('estoque-painel', { overwrite: true });
    cy.visit('/ingredients.html');
    cy.contains('#ing-tbody tr', insumo).scrollIntoView();
    cy.get('main').screenshot('estoque-lista', { overwrite: true, capture: 'viewport' });
  });

  it('contagem corrige o estoque e tira o aviso', () => {
    cy.visit('/ingredients.html');
    cy.contains('#ing-tbody tr', insumo).find('[data-stock]').click();
    cy.get('#stock-adjust-qty').type('1,2');
    cy.get('#stock-adjust-unit').select('kg');
    cy.get('#stock-adjust-save').click();
    cy.get('#stock-current').should('contain', 'Em estoque: 1,2 kg').and('not.contain', 'repor');
    cy.get('#stock-moves li').first().should('contain', 'Contagem').and('contain', '+397,5 g');
    cy.get('#stock-modal').screenshot('estoque-janela', { overwrite: true });
  });
});
