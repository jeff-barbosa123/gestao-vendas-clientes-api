const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

const AUTH_PATH = '/api/auth';
const RECIPES_PATH = '/api/recipes';

const uniqueName = (prefix = 'Ficha') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const baseRecipePayload = (overrides = {}) => ({
  name: uniqueName('Ficha'),
  yield: 10,
  yieldType: 'UN',
  ingredients: [
    { name: 'Farinha', quantity: 1, packageQuantity: 1, cost: 10 },
  ],
  overhead: 0,
  labor: 0,
  margin: 0,
  ...overrides,
});

describe('US005 - Ficha Tecnica', () => {
  let http;
  let adminToken;
  let otherToken;
  let requestCount = 0;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  const createRecipe = async (token, payload = {}) =>
    http
      .post(RECIPES_PATH)
      .set(auth(token))
      .set('x-forwarded-for', `10.1.0.${++requestCount}`)
      .send(baseRecipePayload(payload));

const createRecipeRaw = async (token, payload = {}) =>
    http
      .post(RECIPES_PATH)
      .set(auth(token))
      .set('x-forwarded-for', `10.1.0.${++requestCount}`)
      .send(payload);

  const listRecipes = async (token, query) =>
    http
      .get(`${RECIPES_PATH}${query || ''}`)
      .set(auth(token))
      .set('x-forwarded-for', `10.1.0.${++requestCount}`);

  const getRecipe = async (token, id, query) =>
    http
      .get(`${RECIPES_PATH}/${id}${query || ''}`)
      .set(auth(token))
      .set('x-forwarded-for', `10.1.0.${++requestCount}`);

  const updateRecipe = async (token, id, payload = {}) =>
    http
      .put(`${RECIPES_PATH}/${id}`)
      .set(auth(token))
      .set('x-forwarded-for', `10.1.0.${++requestCount}`)
      .send(payload);

  const deleteRecipe = async (token, id) =>
    http
      .delete(`${RECIPES_PATH}/${id}`)
      .set(auth(token))
      .set('x-forwarded-for', `10.1.0.${++requestCount}`);

  const registerAndLogin = async () => {
    const email = `user+${Date.now()}-${Math.random().toString(16).slice(2)}@teste.com`;
    const password = 'user123';
    await http.post(`${AUTH_PATH}/register`).send({ email, password, name: 'Temp User' });
    const login = await http.post(`${AUTH_PATH}/login`).send({ email, password });
    return login.body.token;
  };

  before(async () => {
    http = getClient();
    adminToken = await loginAndGetToken('admin');
    otherToken = await loginAndGetToken('other');
  });

  it('API-REC-008 | Deve retornar lista vazia quando nao houver fichas tecnicas', async () => {
    const emptyUserToken = await registerAndLogin();
    const res = await listRecipes(emptyUserToken);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').that.is.empty;
  });

  it('API-REC-001 | Deve criar ficha tecnica valida retornando 201', async () => {
    const res = await createRecipe(adminToken);
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('totalCost');
    expect(res.body).to.have.property('costPerUnit');
    expect(res.body.totalCost).to.equal(10);
    expect(res.body.costPerUnit).to.equal(1);
  });

  it('API-REC-002 | Deve criar ficha tecnica com multiplos ingredientes', async () => {
    const res = await createRecipe(adminToken, {
      ingredients: [
        { name: 'Farinha', quantity: 1, packageQuantity: 1, cost: 10 },
        { name: 'Acucar', quantity: 2, packageQuantity: 1, cost: 4 },
      ],
    });

    expect(res.status).to.equal(201);
    expect(res.body.totalCost).to.equal(18);
  });

  it('API-REC-003 | Deve calcular corretamente custos indiretos e mao de obra', async () => {
    const res = await createRecipe(adminToken, {
      overhead: 2,
      labor: 8,
    });

    expect(res.status).to.equal(201);
    expect(res.body.totalCost).to.equal(20);
  });

  it('API-REC-004 | Deve criar ficha tecnica com rendimento decimal', async () => {
    const res = await createRecipe(adminToken, {
      yield: 2.5,
    });

    expect(res.status).to.equal(201);
    expect(res.body.costPerUnit).to.equal(Number((10 / 2.5).toFixed(2)));
  });

  it('API-REC-005 | Deve bloquear criacao de ficha tecnica sem ingredientes', async () => {
    const res = await createRecipe(adminToken, { ingredients: [] });
    expect(res.status).to.equal(400);
  });

  it('API-REC-005B | Deve bloquear criacao sem yieldType', async () => {
    const payload = {
      name: uniqueName('SemYieldType'),
      yield: 10,
      ingredients: [{ name: 'Farinha', quantity: 1, packageQuantity: 1, cost: 10 }],
      overhead: 0,
      labor: 0,
      margin: 0,
    };

    const res = await createRecipeRaw(adminToken, payload);

    expect(res.status).to.equal(400);
  });

  it('API-REC-006 | Deve bloquear criacao de ficha tecnica com nome duplicado', async () => {
    const name = uniqueName('Duplicada');
    const first = await createRecipe(adminToken, { name });
    expect(first.status).to.equal(201);

    const second = await createRecipe(adminToken, { name });
    expect(second.status).to.equal(409);
  });

  it('API-REC-007 | Deve listar fichas tecnicas do usuario autenticado', async () => {
    const created = await createRecipe(adminToken);
    const list = await listRecipes(adminToken);

    expect(created.status).to.equal(201);
    expect(list.status).to.equal(200);
    const ids = list.body.map((r) => r.id);
    expect(ids).to.include(created.body.id);
  });

  it('API-REC-009 | Deve consultar ficha tecnica por ID valido', async () => {
    const created = await createRecipe(adminToken);
    const res = await getRecipe(adminToken, created.body.id);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id', created.body.id);
  });

  it('API-REC-010 | Deve retornar erro ao consultar ficha tecnica inexistente', async () => {
    const res = await getRecipe(adminToken, 'nao-existe');
    expect(res.status).to.equal(404);
  });

  it('API-REC-011 | Deve atualizar parcialmente a ficha tecnica', async () => {
    const created = await createRecipe(adminToken);
    const res = await updateRecipe(adminToken, created.body.id, { name: 'Atualizada' });

    expect(res.status).to.equal(200);
    expect(res.body.name).to.equal('Atualizada');
  });

  it('API-REC-012 | Deve recalcular custos ao atualizar ficha tecnica', async () => {
    const created = await createRecipe(adminToken, {
      ingredients: [{ name: 'Farinha', quantity: 1, packageQuantity: 1, cost: 10 }],
    });

    const updated = await updateRecipe(adminToken, created.body.id, {
      ingredients: [{ name: 'Farinha', quantity: 2, packageQuantity: 1, cost: 10 }],
    });

    expect(updated.status).to.equal(200);
    expect(updated.body.totalCost).to.equal(20);
    expect(updated.body.costPerUnit).to.equal(2);
  });

  it('API-REC-013 | Deve inativar ficha tecnica existente', async () => {
    const created = await createRecipe(adminToken);
    const res = await deleteRecipe(adminToken, created.body.id);

    expect(res.status).to.equal(200);
    expect(res.body.status).to.equal('INACTIVE');
  });

  it('API-REC-014 | Deve calcular custo sem persistir dados', async () => {
    const before = await listRecipes(adminToken);
    const res = await http
      .post(`${RECIPES_PATH}/calculate`)
      .set(auth(adminToken))
      .set('x-forwarded-for', `10.1.0.${++requestCount}`)
      .send(baseRecipePayload());
    const after = await listRecipes(adminToken);

    expect(res.status).to.equal(200);
    expect(after.body.length).to.equal(before.body.length);
  });

  it('API-REC-015 | Deve bloquear acesso sem autenticacao', async () => {
    const res = await http.get(RECIPES_PATH);
    expect(res.status).to.equal(401);
  });

  it('API-REC-016 | Deve bloquear acesso a ficha tecnica de outro usuario (IDOR)', async () => {
    const created = await createRecipe(adminToken);

    const otherGet = await getRecipe(otherToken, created.body.id);
    const otherUpdate = await updateRecipe(otherToken, created.body.id, { name: 'Hack' });
    const otherDelete = await deleteRecipe(otherToken, created.body.id);

    expect(otherGet.status).to.equal(403);
    expect(otherUpdate.status).to.equal(403);
    expect(otherDelete.status).to.equal(403);
  });

  it('API-REC-017 | Deve exportar ficha tecnica valida', async () => {
    const created = await createRecipe(adminToken);
    const res = await http
      .get(`${RECIPES_PATH}/${created.body.id}/export?format=csv`)
      .set(auth(adminToken))
      .set('x-forwarded-for', '10.0.5.1');

    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.include('text/csv');
    expect(res.text).to.include(created.body.name);
  });

  it('API-REC-018 | Deve aplicar rate limit em exportacao', async () => {
    const created = await createRecipe(adminToken);
    const ip = '10.0.5.2';
    const first = await http
      .get(`${RECIPES_PATH}/${created.body.id}/export?format=csv`)
      .set(auth(adminToken))
      .set('x-forwarded-for', ip);
    const second = await http
      .get(`${RECIPES_PATH}/${created.body.id}/export?format=csv`)
      .set(auth(adminToken))
      .set('x-forwarded-for', ip);
    const third = await http
      .get(`${RECIPES_PATH}/${created.body.id}/export?format=csv`)
      .set(auth(adminToken))
      .set('x-forwarded-for', ip);
    const fourth = await http
      .get(`${RECIPES_PATH}/${created.body.id}/export?format=csv`)
      .set(auth(adminToken))
      .set('x-forwarded-for', ip);

    expect(first.status).to.equal(200);
    expect(second.status).to.equal(200);
    expect(third.status).to.equal(200);
    expect(fourth.status).to.equal(429);
  });

  it('SEC-REC-001 | Deve bloquear acesso com token invalido retornando 401', async () => {
    const res = await http
      .get(RECIPES_PATH)
      .set('Authorization', 'Bearer token_invalido');
    expect(res.status).to.equal(401);
  });

  it('SEC-REC-002 | Deve bloquear acesso com token expirado retornando 401', async () => {
    const expired = process.env.EXPIRED_TOKEN || 'token_expirado_mock';
    const res = await http
      .get(RECIPES_PATH)
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).to.equal(401);
  });

  it('SEC-REC-003 | Deve bloquear acesso sem token retornando 401', async () => {
    const res = await http.get(RECIPES_PATH);
    expect(res.status).to.equal(401);
  });

  it('SEC-REC-004 | Deve bloquear enumeracao de parametros no acesso as receitas', async () => {
    const res = await listRecipes(adminToken, '?foo=bar');
    expect(res.status).to.equal(400);
  });

  it('SEC-REC-005 | Deve bloquear SQL Injection nos parametros de receitas', async () => {
    const res = await createRecipe(adminToken, { name: 'Bolo; DROP TABLE recipes' });
    expect(res.status).to.equal(400);
  });

  it('SEC-REC-006 | Deve bloquear XSS nos parametros de receitas', async () => {
    const res = await createRecipe(adminToken, { name: '<script>alert(1)</script>' });
    expect(res.status).to.equal(400);
  });

  it('SEC-REC-007 | Deve bloquear flood de requisicoes nos endpoints de receitas', async () => {
    const ip = '10.0.5.3';
    let lastStatus = 200;
    for (let i = 0; i < 70; i += 1) {
      const res = await http
        .get(RECIPES_PATH)
        .set(auth(adminToken))
        .set('x-forwarded-for', ip);
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).to.equal(429);
  });

  it('SEC-REC-008 | Deve aplicar rate limit especifico em exportacao de ficha tecnica', async () => {
    const created = await createRecipe(adminToken);
    const ip = '10.0.5.4';
    await http
      .get(`${RECIPES_PATH}/${created.body.id}/export?format=csv`)
      .set(auth(adminToken))
      .set('x-forwarded-for', ip);
    await http
      .get(`${RECIPES_PATH}/${created.body.id}/export?format=csv`)
      .set(auth(adminToken))
      .set('x-forwarded-for', ip);
    await http
      .get(`${RECIPES_PATH}/${created.body.id}/export?format=csv`)
      .set(auth(adminToken))
      .set('x-forwarded-for', ip);
    const fourth = await http
      .get(`${RECIPES_PATH}/${created.body.id}/export?format=csv`)
      .set(auth(adminToken))
      .set('x-forwarded-for', ip);

    expect(fourth.status).to.equal(429);
  });

  it('SEC-REC-009 | Deve impedir acesso a ficha tecnica de outro usuario (IDOR)', async () => {
    const created = await createRecipe(adminToken);

    const otherGet = await getRecipe(otherToken, created.body.id);
    const otherUpdate = await updateRecipe(otherToken, created.body.id, { name: 'Hack' });
    const otherDelete = await deleteRecipe(otherToken, created.body.id);

    expect(otherGet.status).to.equal(403);
    expect(otherUpdate.status).to.equal(403);
    expect(otherDelete.status).to.equal(403);
  });

  it('SEC-REC-010 | Deve bloquear mass assignment no payload de receitas', async () => {
    const res = await createRecipe(adminToken, { ownerId: 'u999', isAdmin: true });
    expect(res.status).to.equal(400);

    const created = await createRecipe(adminToken);
    const update = await updateRecipe(adminToken, created.body.id, { ownerId: 'u999' });
    expect(update.status).to.equal(400);
  });

  it.skip('PERF-REC-001 | Deve suportar criacao de ficha tecnica com 100 requisicoes simultaneas', async () => {});
  it.skip('PERF-REC-002 | Deve suportar criacao de ficha tecnica com 500 requisicoes simultaneas', async () => {});
  it.skip('PERF-REC-003 | Deve suportar criacao de ficha tecnica com 1000 requisicoes simultaneas', async () => {});
  it.skip('PERF-REC-004 | Deve suportar consulta de fichas tecnicas com multiplos usuarios simultaneos', async () => {});
  it.skip('PERF-REC-005 | Deve suportar consulta durante criacao simultanea de fichas tecnicas', async () => {});
  it.skip('PERF-REC-006 | Deve suportar consulta durante inativacao em massa de fichas tecnicas', async () => {});
  it.skip('PERF-REC-007 | Deve suportar exportacao de ficha tecnica com multiplos usuarios simultaneos', async () => {});
  it.skip('PERF-REC-008 | Deve suportar exportacao de ficha tecnica em CSV com grande volume de dados', async () => {});
  it.skip('PERF-REC-009 | Deve suportar exportacao de ficha tecnica em PDF com grande volume de dados', async () => {});
  it.skip('PERF-REC-010 | Deve suportar pico de criacao e consulta em curto intervalo de tempo', async () => {});
  it.skip('PERF-REC-011 | Deve suportar uso continuo do cadastro e consulta de receitas', async () => {});
  it.skip('PERF-REC-012 | Deve suportar consulta com base de dados grande', async () => {});
  it.skip('PERF-REC-013 | Deve garantir latencia aceitavel na criacao simples de ficha tecnica', async () => {});
  it.skip('PERF-REC-014 | Deve garantir latencia aceitavel na consulta simples de ficha tecnica', async () => {});
  it.skip('PERF-REC-015 | Deve garantir latencia aceitavel na exportacao de ficha tecnica', async () => {});
});
