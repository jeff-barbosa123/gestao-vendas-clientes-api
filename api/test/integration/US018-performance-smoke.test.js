const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

// Smoke de performance e concorrencia (substitui os antigos placeholders PERF-REP/REC/SIM e API-VIN-018).
// Cargas de 500/1000 requisicoes simultaneas sao teste de carga e pertencem a uma ferramenta
// dedicada (k6/Artillery) em ambiente proprio: no Mocha/CI seriam instaveis e acionariam rate limit.
const CONCURRENCY = 40;
const SLA_SIMPLE_MS = 1500;
const SLA_EXPORT_MS = 4000;
const SLA_BATCH_MS = 15000;

const REVENUE_PATH = '/api/reports/revenue';
const EXPORT_PATH = '/api/reports/revenue/export';
const RECIPES_PATH = '/api/recipes';
const SIM_PATH = '/api/simulacao/preco';
const PRODUCTS_PATH = '/api/products';

const uniq = (p) => `${p}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const RANGE = `year=${new Date().getUTCFullYear()}`;

describe('US018 - Performance e concorrencia (smoke)', function () {
  this.timeout(60000);
  let http;
  let token;
  let ipSeq = 0;
  const ip = () => `10.18.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  const recipePayload = (extra = {}) => ({
    name: uniq('Ficha'),
    yield: 10,
    yieldType: 'UN',
    ingredients: [{ name: 'Farinha', quantity: 1, packageQuantity: 1, cost: 10 }],
    overhead: 0,
    labor: 0,
    margin: 0,
    ...extra,
  });
  const createRecipe = (extra) =>
    http.post(RECIPES_PATH).set(auth()).set('x-forwarded-for', ip()).send(recipePayload(extra));
  const timed = async (fn) => {
    const t0 = Date.now();
    const res = await fn();
    return { res, ms: Date.now() - t0 };
  };

  before(async () => {
    http = getClient();
    token = await loginAndGetToken('admin');
  });

  describe('Latencia (SLA)', () => {
    it('PERF-REC-013 | Criacao simples de ficha tecnica respeita SLA', async () => {
      const { res, ms } = await timed(() => createRecipe());
      expect(res.status).to.equal(201);
      expect(ms).to.be.lessThan(SLA_SIMPLE_MS);
    });

    it('PERF-REC-014 | Consulta simples de ficha tecnica respeita SLA', async () => {
      const created = await createRecipe();
      const { res, ms } = await timed(() =>
        http.get(`${RECIPES_PATH}/${created.body.id}`).set(auth()).set('x-forwarded-for', ip())
      );
      expect(res.status).to.equal(200);
      expect(ms).to.be.lessThan(SLA_SIMPLE_MS);
    });

    it('PERF-REP-013 | Consulta simples de faturamento respeita SLA', async () => {
      const { res, ms } = await timed(() =>
        http.get(`${REVENUE_PATH}?${RANGE}`).set(auth()).set('x-forwarded-for', ip())
      );
      expect(res.status).to.equal(200);
      expect(ms).to.be.lessThan(SLA_SIMPLE_MS);
    });

    it('PERF-REP-014 | Exportacao CSV de faturamento respeita SLA', async () => {
      const { res, ms } = await timed(() =>
        http.get(`${EXPORT_PATH}?${RANGE}&format=csv`).set(auth()).set('x-forwarded-for', ip())
      );
      expect(res.status).to.equal(200);
      expect(ms).to.be.lessThan(SLA_EXPORT_MS);
    });

    it('PERF-REP-009 | Exportacao PDF de faturamento respeita SLA', async () => {
      const { res, ms } = await timed(() =>
        http.get(`${EXPORT_PATH}?${RANGE}&format=pdf`).set(auth()).set('x-forwarded-for', ip())
      );
      expect(res.status).to.equal(200);
      expect(ms).to.be.lessThan(SLA_EXPORT_MS);
    });

    it('PERF-REC-015 | Exportacao de ficha tecnica (CSV e PDF) respeita SLA', async () => {
      const created = await createRecipe();
      for (const format of ['csv', 'pdf']) {
        const { res, ms } = await timed(() =>
          http
            .get(`${RECIPES_PATH}/${created.body.id}/export?format=${format}`)
            .set(auth())
            .set('x-forwarded-for', ip())
        );
        expect(res.status, format).to.equal(200);
        expect(ms, format).to.be.lessThan(SLA_EXPORT_MS);
      }
    });

    it('API-VIN-018 | Vinculo de ficha ao produto respeita SLA', async () => {
      const recipe = await createRecipe();
      const product = await http
        .post(PRODUCTS_PATH)
        .set(auth())
        .set('x-forwarded-for', ip())
        .send({ name: uniq('Produto'), price: 100, purchase_price: 20 });
      const { res, ms } = await timed(() =>
        http
          .post(`${PRODUCTS_PATH}/${product.body.id}/vincular-ficha`)
          .set(auth())
          .set('x-forwarded-for', ip())
          .send({ fichaTecnicaId: recipe.body.id })
      );
      expect(res.status).to.equal(200);
      expect(ms).to.be.lessThan(SLA_SIMPLE_MS);
    });
  });

  describe('Concorrencia', () => {
    it('PERF-REC-001 | Criacao simultanea de fichas tecnicas sem erro nem duplicidade de id', async () => {
      const { res, ms } = await timed(() =>
        Promise.all(Array.from({ length: CONCURRENCY }, () => createRecipe()))
      );
      res.forEach((r) => expect(r.status).to.equal(201));
      expect(new Set(res.map((r) => r.body.id)).size).to.equal(CONCURRENCY);
      expect(ms).to.be.lessThan(SLA_BATCH_MS);
    });

    it('PERF-REC-005 | Consulta durante criacao simultanea permanece consistente', async () => {
      const ops = [];
      for (let i = 0; i < CONCURRENCY; i++) {
        ops.push(i % 2 ? createRecipe() : http.get(RECIPES_PATH).set(auth()).set('x-forwarded-for', ip()));
      }
      const res = await Promise.all(ops);
      res.forEach((r) => expect([200, 201]).to.include(r.status));
    });

    it('PERF-REP-001 | Consulta simultanea de faturamento retorna resultados identicos', async () => {
      const { res, ms } = await timed(() =>
        Promise.all(
          Array.from({ length: CONCURRENCY }, () =>
            http.get(`${REVENUE_PATH}?${RANGE}`).set(auth()).set('x-forwarded-for', ip())
          )
        )
      );
      res.forEach((r) => expect(r.status).to.equal(200));
      const bodies = new Set(res.map((r) => JSON.stringify(r.body)));
      expect(bodies.size).to.equal(1);
      expect(ms).to.be.lessThan(SLA_BATCH_MS);
    });

    it('API-SIM-024 / PERF-SIM-001 | Simulacoes de preco simultaneas sao deterministicas', async () => {
      const recipe = await createRecipe();
      const res = await Promise.all(
        Array.from({ length: CONCURRENCY }, () =>
          http
            .post(SIM_PATH)
            .set(auth())
            .set('x-forwarded-for', ip())
            .send({ receitaId: recipe.body.id, margem: 25 })
        )
      );
      res.forEach((r) => expect(r.status).to.equal(200));
      expect(new Set(res.map((r) => r.body.preco_ideal)).size).to.equal(1);
    });
  });

  describe('Volume', () => {
    it('PERF-SIM-004 | Simulacao com ficha de muitos ingredientes', async () => {
      const ingredients = Array.from({ length: 100 }, (_, i) => ({
        name: `Ing ${i}`,
        quantity: 1,
        packageQuantity: 1,
        cost: 1 + i / 100,
      }));
      const recipe = await createRecipe({ ingredients });
      expect(recipe.status).to.equal(201);
      const { res, ms } = await timed(() =>
        http
          .post(SIM_PATH)
          .set(auth())
          .set('x-forwarded-for', ip())
          .send({ receitaId: recipe.body.id, margem: 30 })
      );
      expect(res.status).to.equal(200);
      expect(ms).to.be.lessThan(SLA_SIMPLE_MS);
    });
  });
});
