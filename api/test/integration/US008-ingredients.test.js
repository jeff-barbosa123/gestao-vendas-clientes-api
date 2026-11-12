// US008 - Cadastro único de insumos com recálculo automático das fichas técnicas e do CMV
const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

describe('US008 - Cadastro de insumos', () => {
  let http;
  let token;
  let otherToken;
  let seq = 0;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });
  const unique = (prefix) => `${prefix} ${Date.now()}-${++seq}`;

  const createIngredient = (t, overrides = {}) =>
    http
      .post('/api/ingredients')
      .set(auth(t))
      .send({ name: unique('Leite condensado'), packageQuantity: 395, packageUnit: 'g', packageCost: 7.5, ...overrides });

  const createProduct = async (t) => {
    const res = await http
      .post('/api/products')
      .set(auth(t))
      .send({ name: unique('Brigadeiro'), price: 4, purchase_price: 1, stock: 100 });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    return res.body;
  };

  // Ficha: 395 g de leite condensado (insumo) + 100 g de chocolate (manual, R$ 4,00 a cada 100 g); rende 20 un
  const createRecipe = async (t, ingredientId, extra = {}) => {
    const res = await http
      .post('/api/recipes')
      .set(auth(t))
      .send({
        name: unique('Brigadeiro tradicional'),
        yield: 20,
        yieldType: 'UN',
        margin: 1.5,
        overhead: 0,
        labor: 0,
        ingredients: [
          // cost enviado errado de propósito: o cadastro de insumos é que manda
          { name: 'Leite condensado', ingredientId, quantity: 395, unit: 'g', packageQuantity: 1, packUnit: 'g', cost: 999 },
          { name: 'Chocolate', quantity: 100, unit: 'g', packageQuantity: 100, packUnit: 'g', cost: 4 },
        ],
        ...extra,
      });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    return res.body;
  };

  before(async () => {
    http = getClient();
    token = await loginAndGetToken('admin');
    otherToken = await loginAndGetToken('other');
  });

  describe('CRUD', () => {
    it('ING-001 | Cadastra e lista insumos do usuário', async () => {
      const created = await createIngredient(token);
      expect(created.status).to.equal(201);
      expect(created.body).to.include({ packageQuantity: 395, packageUnit: 'g', packageCost: 7.5 });

      const list = await http.get('/api/ingredients').set(auth(token));
      expect(list.status).to.equal(200);
      expect(list.body.map((i) => i.id)).to.include(created.body.id);
    });

    it('ING-002 | Valida campos obrigatórios e formatos', async () => {
      const semNome = await createIngredient(token, { name: '' });
      expect(semNome.status).to.equal(400);
      const qtdZero = await createIngredient(token, { packageQuantity: 0 });
      expect(qtdZero.status).to.equal(400);
      const unidade = await createIngredient(token, { packageUnit: 'xicara' });
      expect(unidade.status).to.equal(400);
      const precoNegativo = await createIngredient(token, { packageCost: -1 });
      expect(precoNegativo.status).to.equal(400);
    });

    it('ING-003 | Impede nome duplicado (sem diferenciar maiúsculas)', async () => {
      const name = unique('Farinha de trigo');
      expect((await createIngredient(token, { name })).status).to.equal(201);
      const dup = await createIngredient(token, { name: name.toUpperCase() });
      expect(dup.status).to.equal(409);
    });

    it('ING-004 | Outro usuário não vê nem altera o insumo (IDOR)', async () => {
      const created = await createIngredient(token);
      const id = created.body.id;

      const get = await http.get(`/api/ingredients/${id}`).set(auth(otherToken));
      expect(get.status).to.equal(403);
      const put = await http.put(`/api/ingredients/${id}`).set(auth(otherToken)).send({ packageCost: 0.01 });
      expect(put.status).to.equal(403);
      const del = await http.delete(`/api/ingredients/${id}`).set(auth(otherToken));
      expect(del.status).to.equal(403);

      const list = await http.get('/api/ingredients').set(auth(otherToken));
      expect(list.body.map((i) => i.id)).to.not.include(id);
    });

    it('ING-005 | Exige autenticação', async () => {
      const res = await http.get('/api/ingredients');
      expect(res.status).to.equal(401);
    });
  });

  describe('Ficha técnica usando o cadastro', () => {
    it('ING-006 | Item ligado ao insumo usa o preço do cadastro (ignora o custo enviado)', async () => {
      const ing = (await createIngredient(token)).body;
      const recipe = await createRecipe(token, ing.id);
      // 7,50 (395 g) + 4,00 (100 g) = 11,50 / 20 un = 0,58 (arredondado)
      expect(recipe.costIngredients).to.equal(11.5);
      expect(recipe.costPerUnit).to.equal(0.58);
      const item = recipe.ingredients.find((i) => i.ingredientId === ing.id);
      expect(item).to.exist;
      expect(item.cost).to.equal(7.5);
    });

    it('ING-007 | Mudar o preço do insumo recalcula a ficha e o custo do produto vinculado', async () => {
      const ing = (await createIngredient(token)).body;
      const product = await createProduct(token);
      const recipe = await createRecipe(token, ing.id, { linkProductId: product.id });
      expect(recipe.costPerUnit).to.equal(0.58);

      const upd = await http.put(`/api/ingredients/${ing.id}`).set(auth(token)).send({ packageCost: 11.5 });
      expect(upd.status).to.equal(200);
      expect(upd.body.recalculatedRecipes).to.have.length(1);

      // 11,50 + 4,00 = 15,50 / 20 = 0,78
      const reread = await http.get(`/api/recipes/${recipe.id}`).set(auth(token));
      expect(reread.status).to.equal(200);
      expect(reread.body.costPerUnit).to.equal(0.78);

      const prod = await http.get(`/api/products/${product.id}`).set(auth(token));
      expect(prod.status).to.equal(200);
      expect(prod.body.purchase_price).to.equal(0.78);
      expect(prod.body.custo_por_unidade).to.equal(0.78);
    });

    it('ING-008 | Recálculo preserva a margem da ficha', async () => {
      const ing = (await createIngredient(token)).body;
      const recipe = await createRecipe(token, ing.id); // margem 1.5 = custo x 1,5
      expect(recipe.priceSuggested).to.equal(0.87);

      await http.put(`/api/ingredients/${ing.id}`).set(auth(token)).send({ packageCost: 11.5 });
      const reread = await http.get(`/api/recipes/${recipe.id}`).set(auth(token));
      // 0,78 x 1,5 = 1,17
      expect(reread.body.priceSuggested).to.equal(1.17);
    });

    it('ING-009 | Histórico guarda os preços anteriores', async () => {
      const ing = (await createIngredient(token)).body;
      await http.put(`/api/ingredients/${ing.id}`).set(auth(token)).send({ packageCost: 8.9 });
      const res = await http.get(`/api/ingredients/${ing.id}`).set(auth(token));
      expect(res.status).to.equal(200);
      expect(res.body.history.map((h) => h.packageCost)).to.include.members([7.5, 8.9]);
    });

    it('ING-010 | Não permite usar insumo de outro usuário na ficha', async () => {
      const ing = (await createIngredient(otherToken)).body;
      const res = await http
        .post('/api/recipes')
        .set(auth(token))
        .send({
          name: unique('Ficha com insumo alheio'),
          yield: 10,
          yieldType: 'UN',
          ingredients: [{ name: 'X', ingredientId: ing.id, quantity: 10, unit: 'g', packageQuantity: 10, packUnit: 'g', cost: 1 }],
        });
      expect(res.status).to.equal(403);
    });

    it('ING-011 | Remover o insumo mantém o último preço na ficha', async () => {
      const ing = (await createIngredient(token)).body;
      const recipe = await createRecipe(token, ing.id);
      const del = await http.delete(`/api/ingredients/${ing.id}`).set(auth(token));
      expect(del.status).to.equal(200);
      const reread = await http.get(`/api/recipes/${recipe.id}`).set(auth(token));
      expect(reread.body.costPerUnit).to.equal(recipe.costPerUnit);
    });

    it('ING-012 | Custo por peso não é mais arredondado para centavos por grama', async () => {
      // Farinha: R$ 6,50 o quilo; a ficha usa 500 g = R$ 3,25 (antes calculava R$ 5,00)
      const res = await http
        .post('/api/recipes')
        .set(auth(token))
        .send({
          name: unique('Pão caseiro'),
          yield: 1,
          yieldType: 'UN',
          ingredients: [{ name: 'Farinha', quantity: 500, unit: 'g', packageQuantity: 1, packUnit: 'kg', cost: 6.5 }],
        });
      expect(res.status, JSON.stringify(res.body)).to.equal(201);
      expect(res.body.costIngredients).to.equal(3.25);
    });

    it('ING-013 | Unidade incompatível com o insumo explica o que fazer', async () => {
      const ing = (await createIngredient(token)).body; // cadastrado em g
      const res = await http
        .post('/api/recipes')
        .set(auth(token))
        .send({
          name: unique('Ficha em latas'),
          yield: 10,
          yieldType: 'UN',
          ingredients: [{ name: 'Leite condensado', ingredientId: ing.id, quantity: 2, unit: 'un', packageQuantity: 1, packUnit: 'un', cost: 7.5 }],
        });
      expect(res.status).to.equal(400);
      expect(res.body.message).to.include('cadastrado em g').and.to.include('g ou kg');
    });

    it('ING-014 | Recálculo informa fichas com problema sem desfazer a atualização do insumo', async () => {
      const ing = (await createIngredient(token)).body;
      await createRecipe(token, ing.id);
      // muda a embalagem para "un": a ficha (que usa g) não pode mais ser recalculada
      const upd = await http.put(`/api/ingredients/${ing.id}`).set(auth(token)).send({ packageQuantity: 1, packageUnit: 'un' });
      expect(upd.status).to.equal(200);
      expect(upd.body.packageUnit).to.equal('un');
      expect(upd.body.recalculatedRecipes).to.have.length(0);
      expect(upd.body.recalculationErrors).to.have.length(1);
      expect(upd.body.recalculationErrors[0].error).to.include('cadastrado em un');
    });

    it('REC-MARGEM | Atualização parcial da ficha não zera mais a margem', async () => {
      const ing = (await createIngredient(token)).body;
      const recipe = await createRecipe(token, ing.id);
      const upd = await http.put(`/api/recipes/${recipe.id}`).set(auth(token)).send({ description: 'só a descrição' });
      expect(upd.status).to.equal(200);
      expect(upd.body.priceSuggested).to.equal(recipe.priceSuggested);
    });
  });
});
