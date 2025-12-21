const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

const SIM_PATH = '/api/simulacao/preco';
const QUICK_PATH = '/api/simulacao/preco/rapida';
const RECIPES_PATH = '/api/recipes';

const nextIp = (() => {
  let counter = 1;
  return () => `10.6.0.${counter++}`;
})();

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const baseRecipePayload = (overrides = {}) => ({
  name: `Bolo Teste ${Date.now()}-${Math.random().toString(16).slice(2)}`,
  yield: 10,
  yieldType: 'UN',
  ingredients: [{ name: 'Farinha', quantity: 1, cost: 10, packageQuantity: 1 }],
  overhead: 2,
  labor: 8,
  ...overrides,
});

const baseQuickPayload = (overrides = {}) => ({
  nome: 'Bolo Rapido',
  rendimento: 10,
  ingredientes: [{ nome: 'Ovos', quantidade: 4, custo: 1.5 }],
  overheads: { gas: 1, energia: 0.5 },
  maoDeObra: 2,
  margem: 25,
  ...overrides,
});

describe('US006 - Simulacao de Preco Ideal', () => {
  let client;
  let token;
  let otherToken;
  let recipeId;
  let inactiveRecipeId;

  const createRecipe = async (payload = {}) => {
    const res = await client
      .post(RECIPES_PATH)
      .set(auth(token))
      .set('x-forwarded-for', nextIp())
      .send(baseRecipePayload(payload));
    return res.body.id;
  };

  const getRecipe = async (id) =>
    client
      .get(`${RECIPES_PATH}/${id}`)
      .set(auth(token))
      .set('x-forwarded-for', nextIp());

  const simulateById = async (body, query = '') =>
    client
      .post(`${SIM_PATH}${query}`)
      .set(auth(token))
      .set('x-forwarded-for', nextIp())
      .send(body);

  const simulateQuick = async (body, query = '') =>
    client
      .post(`${QUICK_PATH}${query}`)
      .set(auth(token))
      .set('x-forwarded-for', nextIp())
      .send(body);

  before(async () => {
    client = getClient();
    token = await loginAndGetToken('admin');
    otherToken = await loginAndGetToken('other');

    recipeId = await createRecipe();

    inactiveRecipeId = await createRecipe({ name: `Inativa ${Date.now()}` });
    await client
      .delete(`${RECIPES_PATH}/${inactiveRecipeId}`)
      .set(auth(token))
      .set('x-forwarded-for', nextIp());
  });

  it('API-SIM-001 | Deve simular preco ideal via ID de receita valida', async () => {
    const response = await simulateById({ receitaId: recipeId, margem: 30 });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.keys([
      'custo_total',
      'custo_por_unidade',
      'preco_minimo',
      'preco_ideal',
      'margem',
      'taxa_entrega',
      'preco_final_simulado',
      'valor_lucro',
      'lucro_estimado',
      'custoUnitario',
      'margemLucroPercentual',
      'taxaEntrega',
      'precoFinalSimulado',
      'valorLucro',
      'lucroEstimado',
    ]);
  });

  it('API-SIM-002 | Deve simular preco com margem valida', async () => {
    const response = await simulateById({ receitaId: recipeId, margem: 20 });

    expect(response.status).to.equal(200);
    expect(response.body.preco_ideal).to.be.greaterThan(response.body.preco_minimo);
  });

  it('API-SIM-003 | Deve simular preco com margem zero', async () => {
    const response = await simulateById({ receitaId: recipeId, margem: 0 });

    expect(response.status).to.equal(200);
    expect(response.body.preco_ideal).to.equal(response.body.preco_minimo);
  });

  it('API-SIM-004 | Deve bloquear simulacao com margem negativa', async () => {
    const response = await simulateById({ receitaId: recipeId, margem: -10 });

    expect(response.status).to.equal(400);
  });

  it('API-SIM-005 | Deve simular preco com margem alta', async () => {
    const response = await simulateById({ receitaId: recipeId, margem: 500 });

    expect(response.status).to.equal(200);
    expect(response.body.preco_ideal).to.be.greaterThan(response.body.preco_minimo);
  });

  it('API-SIM-006 | Deve bloquear simulacao de receita inexistente', async () => {
    const response = await simulateById({ receitaId: 'inexistente', margem: 10 });

    expect(response.status).to.equal(404);
  });

  it('API-SIM-007 | Deve bloquear simulacao de receita inativa', async () => {
    const response = await simulateById({ receitaId: inactiveRecipeId, margem: 10 });

    expect(response.status).to.equal(404);
  });

  it('API-SIM-008 | Deve bloquear simulacao sem margem informada', async () => {
    const response = await simulateById({ receitaId: recipeId });

    expect(response.status).to.equal(400);
  });

  it('API-SIM-009 | Deve bloquear simulacao com margem invalida', async () => {
    const response = await simulateById({ receitaId: recipeId, margem: 'abc' });

    expect(response.status).to.equal(400);
  });

  it('API-SIM-010 | Deve simular preco rapido com ficha tecnica valida', async () => {
    const response = await simulateQuick(baseQuickPayload());

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('preco_ideal');
  });

  it('API-SIM-010B | Deve simular preco com taxa de entrega', async () => {
    const response = await simulateById({ receitaId: recipeId, margem: 20, taxaEntrega: 2.5 });

    expect(response.status).to.equal(200);
    expect(response.body.taxa_entrega).to.equal(2.5);
    expect(response.body.preco_final_simulado).to.be.greaterThan(response.body.preco_ideal);
  });

  it('API-SIM-011 | Deve bloquear simulacao rapida sem ingredientes', async () => {
    const response = await simulateQuick(baseQuickPayload({ ingredientes: [] }));

    expect(response.status).to.equal(400);
  });

  it('API-SIM-012 | Deve bloquear simulacao rapida sem rendimento', async () => {
    const payload = baseQuickPayload({ rendimento: undefined });
    delete payload.rendimento;

    const response = await simulateQuick(payload);

    expect(response.status).to.equal(400);
  });

  it('API-SIM-013 | Deve bloquear simulacao rapida com ingrediente invalido', async () => {
    const response = await simulateQuick(
      baseQuickPayload({ ingredientes: [{ nome: '', quantidade: 0, custo: 1 }] })
    );

    expect(response.status).to.equal(400);
  });

  it('API-SIM-014 | Deve simular preco rapido com overhead zerado', async () => {
    const response = await simulateQuick(
      baseQuickPayload({ overheads: { gas: 0 }, overhead: 0 })
    );

    expect(response.status).to.equal(200);
  });

  it('API-SIM-015 | Deve simular preco rapido com mao de obra zerada', async () => {
    const response = await simulateQuick(baseQuickPayload({ maoDeObra: 0 }));

    expect(response.status).to.equal(200);
  });

  it('API-SIM-016 | Deve garantir arredondamento financeiro', async () => {
    const response = await simulateQuick(
      baseQuickPayload({
        rendimento: 3,
        ingredientes: [{ nome: 'Acucar', quantidade: 1, custo: 1.337 }],
        overheads: { gas: 0.123 },
        maoDeObra: 0.456,
      })
    );

    expect(response.status).to.equal(200);
    expect(Number.isInteger(response.body.custo_total * 100)).to.equal(true);
    expect(Number.isInteger(response.body.custo_por_unidade * 100)).to.equal(true);
    expect(Number.isInteger(response.body.preco_minimo * 100)).to.equal(true);
    expect(Number.isInteger(response.body.preco_ideal * 100)).to.equal(true);
  });

  it('API-SIM-017 | Deve garantir determinismo da simulacao', async () => {
    const first = await simulateById({ receitaId: recipeId, margem: 15 });
    const second = await simulateById({ receitaId: recipeId, margem: 15 });

    expect(first.status).to.equal(200);
    expect(second.status).to.equal(200);
    expect(second.body).to.deep.equal(first.body);
  });

  it('API-SIM-018 | Deve garantir nao persistencia da simulacao', async () => {
    const before = await getRecipe(recipeId);
    const response = await simulateById({ receitaId: recipeId, margem: 22 });
    const after = await getRecipe(recipeId);

    expect(response.status).to.equal(200);
    expect(after.body.totalCost).to.equal(before.body.totalCost);
    expect(after.body.costPerUnit).to.equal(before.body.costPerUnit);
  });

  it('API-SIM-019 | Deve bloquear simulacao sem token', async () => {
    const response = await client
      .post(SIM_PATH)
      .set('x-forwarded-for', nextIp())
      .send({ receitaId: recipeId, margem: 10 });

    expect(response.status).to.equal(401);
  });

  it('API-SIM-020 | Deve bloquear simulacao com token invalido', async () => {
    const response = await client
      .post(SIM_PATH)
      .set('Authorization', 'Bearer token_invalido')
      .set('x-forwarded-for', nextIp())
      .send({ receitaId: recipeId, margem: 10 });

    expect(response.status).to.equal(401);
  });

  it('API-SIM-021 | Deve bloquear simulacao com token expirado', async () => {
    const expired = process.env.EXPIRED_TOKEN || 'token_expirado_mock';
    const response = await client
      .post(SIM_PATH)
      .set('Authorization', `Bearer ${expired}`)
      .set('x-forwarded-for', nextIp())
      .send({ receitaId: recipeId, margem: 10 });

    expect(response.status).to.equal(401);
  });

  it('API-SIM-022 | Deve bloquear simulacao de receita de outro usuario (IDOR)', async () => {
    const response = await client
      .post(SIM_PATH)
      .set(auth(otherToken))
      .set('x-forwarded-for', nextIp())
      .send({ receitaId: recipeId, margem: 10 });

    expect(response.status).to.equal(403);
  });

  it('SEC-SIM-004 | Deve bloquear enumeracao de parametros', async () => {
    const response = await simulateById({ receitaId: recipeId, margem: 10 }, '?foo=bar');

    expect(response.status).to.equal(400);

    const getResponse = await client
      .get(`${SIM_PATH}/${recipeId}?margem=10&foo=bar`)
      .set(auth(token))
      .set('x-forwarded-for', nextIp());

    expect(getResponse.status).to.equal(400);
  });

  it('SEC-SIM-005 | Deve bloquear SQL Injection nos parametros', async () => {
    const response = await simulateById({ receitaId: '1;DROP TABLE recipes', margem: 10 });

    expect(response.status).to.equal(400);
  });

  it('SEC-SIM-006 | Deve bloquear XSS nos parametros', async () => {
    const response = await simulateQuick(
      baseQuickPayload({ ingredientes: [{ nome: '<script>alert(1)</script>', quantidade: 1, custo: 1 }] })
    );

    expect(response.status).to.equal(400);
  });

  it('SEC-SIM-007 | Deve bloquear flood de requisicoes', async () => {
    const ip = '10.6.9.1';
    let lastStatus = 200;

    for (let i = 0; i < 65; i += 1) {
      const res = await client
        .post(SIM_PATH)
        .set(auth(token))
        .set('x-forwarded-for', ip)
        .send({ receitaId: recipeId, margem: 10 });
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }

    expect(lastStatus).to.equal(429);
  });

  it('SEC-SIM-010 | Deve bloquear mass assignment no payload de simulacao', async () => {
    const response = await simulateById({ receitaId: recipeId, margem: 10, ownerId: 'u999' });

    expect(response.status).to.equal(400);
  });

  it('SEC-SIM-011 | Deve bloquear header Authorization malformado', async () => {
    const response = await client
      .post(SIM_PATH)
      .set('Authorization', 'Bearer')
      .set('x-forwarded-for', nextIp())
      .send({ receitaId: recipeId, margem: 10 });

    expect(response.status).to.equal(401);
  });

  it('SEC-SIM-012 | Deve bloquear payload excessivamente grande', async () => {
    const bigName = 'a'.repeat(2_000_000);
    const response = await simulateQuick(
      baseQuickPayload({
        ingredientes: [{ nome: bigName, quantidade: 1, custo: 1 }],
        rendimento: 1,
      })
    );

    expect([400, 413]).to.include(response.status);
  });

  it('API-SIM-023 | Deve simular via GET /simulacao/preco/:id', async () => {
    const response = await client
      .get(`${SIM_PATH}/${recipeId}?margem=15`)
      .set(auth(token))
      .set('x-forwarded-for', nextIp());

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('margem', 15);
  });

  it.skip('API-SIM-024 | Deve suportar multiplas simulacoes simultaneas', async () => {});
  it.skip('PERF-SIM-001 | Deve suportar 100 requisicoes simultaneas', async () => {});
  it.skip('PERF-SIM-002 | Deve suportar 500 requisicoes simultaneas', async () => {});
  it.skip('PERF-SIM-003 | Deve suportar 1000 requisicoes simultaneas', async () => {});
  it.skip('PERF-SIM-004 | Deve suportar payload grande com muitos ingredientes', async () => {});
});
