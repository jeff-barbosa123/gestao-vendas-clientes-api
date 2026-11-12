// US010 - Estoque de insumos: entrada de compra, baixa pela venda, devolução e aviso de reposição
const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

describe('US010 - Estoque de insumos', () => {
  let http;
  let token;
  let otherToken;
  let seq = 0;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });
  const unique = (prefix) => `${prefix} ${Date.now()}-${++seq}`;

  const createIngredient = async (overrides = {}) => {
    const res = await http
      .post('/api/ingredients')
      .set(auth(token))
      .send({ name: unique('Leite condensado'), packageQuantity: 395, packageUnit: 'g', packageCost: 7.5, ...overrides });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    return res.body;
  };

  // Produto com ficha: rende 20 brigadeiros com 395 g de leite condensado (insumo) + 100 g de chocolate (manual)
  const createLinkedProduct = async (ingredientId) => {
    const product = await http
      .post('/api/products')
      .set(auth(token))
      .send({ name: unique('Brigadeiro'), price: 4, purchase_price: 1, stock: 1000 });
    expect(product.status, JSON.stringify(product.body)).to.equal(201);
    const recipe = await http
      .post('/api/recipes')
      .set(auth(token))
      .send({
        name: unique('Ficha brigadeiro'),
        yield: 20,
        yieldType: 'UN',
        margin: 1.5,
        overhead: 0,
        labor: 0,
        linkProductId: product.body.id,
        ingredients: [
          { name: 'Leite condensado', ingredientId, quantity: 395, unit: 'g', packageQuantity: 395, packUnit: 'g', cost: 7.5 },
          { name: 'Chocolate', quantity: 100, unit: 'g', packageQuantity: 100, packUnit: 'g', cost: 4 },
        ],
      });
    expect(recipe.status, JSON.stringify(recipe.body)).to.equal(201);
    return product.body;
  };

  const sell = (productId, quantity) =>
    http
      .post('/api/sales')
      .set(auth(token))
      .send({ clienteNome: 'Cliente Estoque', items: [{ productId, quantity }], paymentMethod: 'PIX' });

  const stockOf = async (id) => {
    const res = await http.get(`/api/ingredients/${id}`).set(auth(token));
    expect(res.status).to.equal(200);
    return res.body;
  };

  before(async () => {
    http = getClient();
    token = await loginAndGetToken('admin');
    otherToken = await loginAndGetToken('other');
  });

  it('EST-001 | Insumo novo começa sem controle de estoque', async () => {
    const ing = await createIngredient();
    expect(ing.stockQuantity).to.equal(null);
    expect(ing.stockUnit).to.equal('g');
    expect(ing.lowStock).to.equal(false);
  });

  it('EST-002 | Entrada de compra em kg soma ao estoque em gramas', async () => {
    const ing = await createIngredient();
    const res = await http
      .post(`/api/ingredients/${ing.id}/stock/purchases`)
      .set(auth(token))
      .send({ quantity: 2, unit: 'kg' });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    expect(res.body.stockQuantity).to.equal(2000);
    const again = await http.post(`/api/ingredients/${ing.id}/stock/purchases`).set(auth(token)).send({ quantity: 395, unit: 'g' });
    expect(again.body.stockQuantity).to.equal(2395);
  });

  it('EST-003 | Compra com valor pago atualiza o preço do insumo e recalcula as fichas', async () => {
    const ing = await createIngredient();
    await createLinkedProduct(ing.id);
    const res = await http
      .post(`/api/ingredients/${ing.id}/stock/purchases`)
      .set(auth(token))
      .send({ quantity: 395, unit: 'g', totalCost: 9.9 });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    expect(res.body.stockQuantity).to.equal(395);
    expect(res.body.recalculatedRecipes).to.have.length(1);
    const reread = await stockOf(ing.id);
    expect(reread.packageCost).to.equal(9.9);
    expect(reread.history[0].packageCost).to.equal(9.9);
  });

  it('EST-004 | Unidade incompatível na compra explica o que fazer', async () => {
    const ing = await createIngredient();
    const res = await http.post(`/api/ingredients/${ing.id}/stock/purchases`).set(auth(token)).send({ quantity: 1, unit: 'l' });
    expect(res.status).to.equal(400);
    expect(res.body.message).to.contain('controlado em g');
  });

  it('EST-005 | Venda desconta os insumos pela ficha técnica (quantidade / rendimento x vendidos)', async () => {
    const ing = await createIngredient();
    await http.post(`/api/ingredients/${ing.id}/stock/adjust`).set(auth(token)).send({ quantity: 1000, unit: 'g' });
    const product = await createLinkedProduct(ing.id);

    const sale = await sell(product.id, 10); // 10 x 395/20 = 197,5 g
    expect(sale.status, JSON.stringify(sale.body)).to.equal(201);

    const after = await stockOf(ing.id);
    expect(after.stockQuantity).to.equal(802.5);

    const moves = await http.get(`/api/ingredients/${ing.id}/stock/movements`).set(auth(token));
    expect(moves.status).to.equal(200);
    expect(moves.body[0]).to.include({ type: 'SALE', quantity: -197.5, balanceAfter: 802.5, saleId: sale.body.id });
  });

  it('EST-006 | Cancelar a venda devolve os insumos (e cancelar de novo não devolve em dobro)', async () => {
    const ing = await createIngredient();
    await http.post(`/api/ingredients/${ing.id}/stock/adjust`).set(auth(token)).send({ quantity: 1, unit: 'kg' });
    const product = await createLinkedProduct(ing.id);
    const sale = await sell(product.id, 20); // 395 g
    expect((await stockOf(ing.id)).stockQuantity).to.equal(605);

    expect((await http.post(`/api/sales/${sale.body.id}/cancel`).set(auth(token)).send({})).status).to.equal(200);
    expect((await stockOf(ing.id)).stockQuantity).to.equal(1000);

    await http.post(`/api/sales/${sale.body.id}/cancel`).set(auth(token)).send({});
    expect((await stockOf(ing.id)).stockQuantity).to.equal(1000);
  });

  it('EST-007 | Editar os itens da venda refaz a baixa', async () => {
    const ing = await createIngredient();
    await http.post(`/api/ingredients/${ing.id}/stock/adjust`).set(auth(token)).send({ quantity: 1000, unit: 'g' });
    const product = await createLinkedProduct(ing.id);
    const sale = await sell(product.id, 4); // 79 g
    expect((await stockOf(ing.id)).stockQuantity).to.equal(921);

    const upd = await http
      .put(`/api/sales/${sale.body.id}`)
      .set(auth(token))
      .send({ items: [{ productId: product.id, quantity: 8 }] }); // 158 g
    expect(upd.status, JSON.stringify(upd.body)).to.equal(200);
    expect((await stockOf(ing.id)).stockQuantity).to.equal(842);
  });

  it('EST-008 | Insumo sem controle de estoque não é descontado', async () => {
    const ing = await createIngredient();
    const product = await createLinkedProduct(ing.id);
    expect((await sell(product.id, 5)).status).to.equal(201);
    expect((await stockOf(ing.id)).stockQuantity).to.equal(null);
  });

  it('EST-009 | Estoque mínimo gera aviso na venda, na lista e no painel', async () => {
    const ing = await createIngredient();
    await http.post(`/api/ingredients/${ing.id}/stock/adjust`).set(auth(token)).send({ quantity: 500, unit: 'g' });
    const min = await http.put(`/api/ingredients/${ing.id}/stock/min`).set(auth(token)).send({ minStock: 400, unit: 'g' });
    expect(min.status).to.equal(200);
    expect(min.body).to.include({ minStock: 400, lowStock: false });

    const product = await createLinkedProduct(ing.id);
    const sale = await sell(product.id, 10); // 197,5 g -> 302,5 g
    expect(sale.status).to.equal(201);
    expect(sale.body.lowStockIngredients.map((i) => i.id)).to.include(ing.id);

    const low = await http.get('/api/ingredients/low-stock').set(auth(token));
    expect(low.status).to.equal(200);
    expect(low.body.map((i) => i.id)).to.include(ing.id);

    const overview = await http.get('/api/analytics/overview').set(auth(token));
    const alert = overview.body.stockAlerts.find((a) => a.ingredientId === ing.id);
    expect(alert).to.include({ stockQuantity: 302.5, minStock: 400, stockUnit: 'g' });
  });

  it('EST-010 | Ajuste por contagem define o valor exato e registra a diferença', async () => {
    const ing = await createIngredient({ packageQuantity: 12, packageUnit: 'un', packageCost: 18 });
    await http.post(`/api/ingredients/${ing.id}/stock/purchases`).set(auth(token)).send({ quantity: 30, unit: 'un' });
    const adj = await http.post(`/api/ingredients/${ing.id}/stock/adjust`).set(auth(token)).send({ quantity: 26, note: 'contagem' });
    expect(adj.status).to.equal(200);
    expect(adj.body.stockQuantity).to.equal(26);
    const moves = await http.get(`/api/ingredients/${ing.id}/stock/movements`).set(auth(token));
    expect(moves.body[0]).to.include({ type: 'ADJUST', quantity: -4, note: 'contagem' });
  });

  it('EST-011 | Desligar o controle limpa estoque e mínimo', async () => {
    const ing = await createIngredient();
    await http.post(`/api/ingredients/${ing.id}/stock/adjust`).set(auth(token)).send({ quantity: 100 });
    const off = await http.delete(`/api/ingredients/${ing.id}/stock`).set(auth(token));
    expect(off.status).to.equal(200);
    expect(off.body).to.include({ stockQuantity: null, minStock: null });
  });

  it('EST-012 | Valida quantidades e protege o insumo de outro usuário', async () => {
    const ing = await createIngredient();
    const zero = await http.post(`/api/ingredients/${ing.id}/stock/purchases`).set(auth(token)).send({ quantity: 0 });
    expect(zero.status).to.equal(400);
    const neg = await http.post(`/api/ingredients/${ing.id}/stock/adjust`).set(auth(token)).send({ quantity: -5 });
    expect(neg.status).to.equal(400);
    const idor = await http.post(`/api/ingredients/${ing.id}/stock/purchases`).set(auth(otherToken)).send({ quantity: 10 });
    expect(idor.status).to.be.oneOf([403, 404]);
    const anon = await http.get('/api/ingredients/low-stock');
    expect(anon.status).to.equal(401);
  });
});
