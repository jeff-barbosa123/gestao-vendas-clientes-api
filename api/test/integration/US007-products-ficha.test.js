const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

const PRODUCTS_PATH = '/api/products';
const RECIPES_PATH = '/api/recipes';
const SALES_PATH = '/api/sales';
const CUSTOMERS_PATH = '/api/customers';

const nextIp = (() => {
  let counter = 1;
  return () => `10.7.0.${counter++}`;
})();

const MESSAGES = {
  missing: 'Campos obrigatórios ausentes',
  productNotFound: 'Produto não encontrado',
  recipeNotFound: 'Ficha técnica não encontrada',
  forbiddenRecipe: 'Você não tem permissão para usar esta ficha técnica',
  conflict: 'O produto já possui ficha técnica vinculada',
  invalidYield: 'É proibido vincular ficha técnica com rendimento igual a zero',
};

const uniqueName = (prefix = 'Item') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('US007 - Vincular ficha técnica ao produto', () => {
  let http;
  let adminToken;
  let otherToken;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  const createProduct = async (token, payload = {}) => {
    const res = await http
      .post(PRODUCTS_PATH)
      .set(auth(token))
      .set('x-forwarded-for', nextIp())
      .send({
        name: uniqueName('Produto'),
        price: 100,
        purchase_price: 20,
        ...payload,
      });
    return res.body;
  };

  const getProduct = async (token, id) => {
    const res = await http
      .get(`${PRODUCTS_PATH}/${id}`)
      .set(auth(token))
      .set('x-forwarded-for', nextIp());
    return res.body;
  };

  const createRecipe = async (token, payload = {}) => {
    const base = {
      name: uniqueName('Ficha'),
      yield: 10,
      yieldType: 'UN',
      ingredients: [
        { name: 'Farinha', quantity: 1, packageQuantity: 1, cost: 10 },
        { name: 'Ovos', quantity: 2, packageQuantity: 2, cost: 6 },
      ],
      overhead: 0,
      labor: 0,
      margin: 0,
      ...payload,
    };
    const res = await http
      .post(RECIPES_PATH)
      .set(auth(token))
      .set('x-forwarded-for', nextIp())
      .send(base);
    return res.body;
  };

  const updateRecipe = async (token, id, payload = {}) => {
    const res = await http
      .put(`${RECIPES_PATH}/${id}`)
      .set(auth(token))
      .set('x-forwarded-for', nextIp())
      .send(payload);
    return res.body;
  };

  const createCustomer = async (token) => {
    const res = await http
      .post(CUSTOMERS_PATH)
      .set(auth(token))
      .set('x-forwarded-for', nextIp())
      .send({
        name: uniqueName('Cliente'),
        email: `cliente+${Date.now()}@teste.com`,
        phone: '11999990000',
      });
    return res.body.id;
  };

  const createSale = async (token, productId, customerId) => {
    const res = await http
      .post(SALES_PATH)
      .set(auth(token))
      .set('x-forwarded-for', nextIp())
      .send({
        customerId,
        items: [{ productId, quantity: 1, unitPrice: 50 }],
        paymentMethod: 'PIX',
        date: '2099-03-10',
      });
    return res.body;
  };

  before(async () => {
    http = getClient();
    adminToken = await loginAndGetToken('admin');
    otherToken = await loginAndGetToken('other');
  });

  it('Deve vincular ficha técnica ao produto e atualizar custos (200)', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);

    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    expect(res.status).to.equal(200);
    expect(res.body.fichaTecnicaId).to.equal(recipe.id);
    expect(res.body.purchase_price).to.equal(recipe.costPerUnit);
    expect(res.body.custo_por_unidade).to.equal(recipe.costPerUnit);
    expect(res.body.preco_minimo).to.equal(recipe.priceMinimum);
  });

  it('Deve ressincronizar custos quando a ficha for atualizada', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);

    await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    const updatedRecipe = await updateRecipe(adminToken, recipe.id, {
      ingredients: [
        { name: 'Farinha', quantity: 1, packageQuantity: 1, cost: 20 },
        { name: 'Ovos', quantity: 2, packageQuantity: 2, cost: 6 },
      ],
    });

    const updatedProduct = await getProduct(adminToken, product.id);
    expect(updatedProduct.purchase_price).to.equal(updatedRecipe.costPerUnit);
    expect(updatedProduct.custo_por_unidade).to.equal(updatedRecipe.costPerUnit);
    expect(updatedProduct.preco_minimo).to.equal(updatedRecipe.priceMinimum);
  });

  it('Deve impedir vínculo quando o produto já possui ficha técnica (409)', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);

    const first = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });
    expect(first.status).to.equal(200);

    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    expect(res.status).to.equal(409);
    expect(res.body.error).to.equal(MESSAGES.conflict);
  });

  it('Deve retornar 400 quando faltar fichaTecnicaId', async () => {
    const product = await createProduct(adminToken);
    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({});

    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal(MESSAGES.missing);
  });

  it('Deve retornar 404 quando o produto não existe', async () => {
    const res = await http
      .post(`${PRODUCTS_PATH}/nao-existe/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: 'id-qualquer' });

    expect(res.status).to.equal(404);
    expect(res.body.error).to.equal(MESSAGES.productNotFound);
  });

  it('Deve retornar 404 quando a ficha técnica não existe', async () => {
    const product = await createProduct(adminToken);
    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: 'ficha-inexistente' });

    expect(res.status).to.equal(404);
    expect(res.body.error).to.equal(MESSAGES.recipeNotFound);
  });

  it('Deve impedir usar ficha técnica de outro usuário (403)', async () => {
    const product = await createProduct(adminToken);
    const otherRecipe = await createRecipe(otherToken);

    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: otherRecipe.id });

    expect(res.status).to.equal(403);
    expect(res.body.error).to.equal(MESSAGES.forbiddenRecipe);
  });

  it('Deve remover o vínculo (200) e limpar custos automáticos', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);

    await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    const res = await http
      .delete(`${PRODUCTS_PATH}/${product.id}/remover-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp());

    expect(res.status).to.equal(200);
    expect(res.body.fichaTecnicaId).to.equal(null);
    expect(res.body.custo_por_unidade).to.equal(null);
    expect(res.body.preco_minimo).to.equal(null);
  });

  it('Deve retornar a ficha técnica vinculada (200)', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);

    await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    const res = await http
      .get(`${PRODUCTS_PATH}/${product.id}/ficha-tecnica`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp());

    expect(res.status).to.equal(200);
    expect(res.body.id).to.equal(recipe.id);
    expect(res.body.linkProductId).to.equal(product.id);
  });

  it('Deve retornar 404 ao consultar ficha quando não há vínculo', async () => {
    const product = await createProduct(adminToken);

    const res = await http
      .get(`${PRODUCTS_PATH}/${product.id}/ficha-tecnica`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp());

    expect(res.status).to.equal(404);
    expect(res.body.error).to.equal(MESSAGES.recipeNotFound);
  });
  it('API-VIN-002 | Deve bloquear vinculo sem ID do produto', async () => {
    const recipe = await createRecipe(adminToken);
    const res = await http
      .post(`${PRODUCTS_PATH}//vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    expect([400, 404]).to.include(res.status);
  });

  it('API-VIN-008 | Deve bloquear vinculo com rendimento igual a zero', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken, { yield: 0 });

    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    expect([400, 422]).to.include(res.status);
  });

  it('API-VIN-010 | Deve bloquear edicao manual de custo apos vinculo', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);

    await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    const res = await http
      .put(`${PRODUCTS_PATH}/${product.id}`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ purchase_price: 999 });

    expect([400, 403, 409]).to.include(res.status);
  });

  it('API-VIN-013 | Deve bloquear remocao de vinculo em produto com vendas', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);

    await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    const customerId = await createCustomer(adminToken);
    await createSale(adminToken, product.id, customerId);

    const res = await http
      .delete(`${PRODUCTS_PATH}/${product.id}/remover-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp());

    expect(res.status).to.equal(409);
  });

  it('API-VIN-015 | Deve bloquear vinculo sem autenticacao', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);
    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    expect(res.status).to.equal(401);
  });

  it('API-VIN-016 | Deve bloquear vinculo com token invalido', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);
    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set('Authorization', 'Bearer token_invalido')
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    expect(res.status).to.equal(401);
  });

  it('API-VIN-017 | Deve bloquear vinculo com token expirado', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);
    const expired = process.env.EXPIRED_TOKEN || 'token_expirado_mock';
    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set('Authorization', `Bearer ${expired}`)
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    expect(res.status).to.equal(401);
  });

  it('SEC-VIN-004 | Deve bloquear enumeracao de parametros no vinculo', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);

    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha?foo=bar`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    expect(res.status).to.equal(400);
  });

  it('SEC-VIN-005 | Deve bloquear SQL Injection nos parametros de vinculo', async () => {
    const product = await createProduct(adminToken);
    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: '1;DROP TABLE recipes' });

    expect(res.status).to.equal(400);
  });

  it('SEC-VIN-006 | Deve bloquear XSS nos parametros de vinculo', async () => {
    const product = await createProduct(adminToken);
    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: '<script>alert(1)</script>' });

    expect(res.status).to.equal(400);
  });

  it('SEC-VIN-007 | Deve bloquear flood de requisicoes nos endpoints de vinculo', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);
    const ip = '10.7.0.200';

    await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', ip)
      .send({ fichaTecnicaId: recipe.id });

    let lastStatus = 200;
    for (let i = 0; i < 70; i += 1) {
      const res = await http
        .get(`${PRODUCTS_PATH}/${product.id}/ficha-tecnica`)
        .set(auth(adminToken))
        .set('x-forwarded-for', ip);
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }

    expect(lastStatus).to.equal(429);
  });

  it('SEC-VIN-010 | Deve bloquear mass assignment no payload de vinculo', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);
    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id, ownerId: 'u999', isAdmin: true });

    expect(res.status).to.equal(400);
  });

  it('SEC-VIN-011 | Deve bloquear header Authorization malformado', async () => {
    const product = await createProduct(adminToken);
    const recipe = await createRecipe(adminToken);
    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set('Authorization', 'Bearer')
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: recipe.id });

    expect(res.status).to.equal(401);
  });

  it('SEC-VIN-012 | Deve bloquear payload excessivamente grande', async () => {
    const product = await createProduct(adminToken);
    const bigId = 'a'.repeat(2_000_000);
    const res = await http
      .post(`${PRODUCTS_PATH}/${product.id}/vincular-ficha`)
      .set(auth(adminToken))
      .set('x-forwarded-for', nextIp())
      .send({ fichaTecnicaId: bigId });

    expect([400, 413]).to.include(res.status);
  });

  it.skip('API-VIN-018 | Deve garantir tempo de resposta aceitavel no vinculo', async () => {});
});
