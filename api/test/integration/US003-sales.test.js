const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

const SALES_PATH = '/api/sales';

describe('US003 - Vendas', () => {
  let client;
  let token;
  let customerId;
  let productId;

  const createProduct = async (overrides = {}) => {
    const productResp = await client
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Produto Venda ${Date.now()}`,
        price: 100,
        purchase_price: 50,
        stock: 10,
        ...overrides,
      });

    return productResp.body;
  };

  before(async () => {
    client = getClient();

    // Login padrão reutilizado
    token = await loginAndGetToken('admin');

    // Cria um cliente para a venda
    const customerResp = await client
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Cliente Venda',
        email: `sale+${Date.now()}@teste.com`, // e-mail único para evitar conflito
        phone: '11999990000',
      });
    customerId = customerResp.body.id;

    // Cria um produto para a venda (price e purchase_price são obrigatórios)
    const product = await createProduct();
    productId = product.id;
  });

  /**
   * API-SALES-001
   * Deve criar uma venda válida retornando 201
   */
  it('API-SALES-001 | Deve criar uma venda válida retornando 201 e os dados cadastrados', async () => {
    const response = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 2 }],
        paymentMethod: 'PIX',
      });

    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('id');
    expect(response.body).to.have.property('total');
    expect(response.body.items).to.be.an('array').with.length.greaterThan(0);
  });

  it('API-VEN-002 | Deve impedir criação de venda com cliente inexistente retornando 422', async () => {
    const response = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: 'inexistente',
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'CASH',
      });

    expect(response.status).to.equal(422);
    expect(response.body).to.have.property('message');
  });

  it('API-VEN-003 | Deve impedir criação de venda com produto inexistente retornando 422', async () => {
    const response = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId: 999999, quantity: 1 }], // ID válido no formato, mas inexistente
        paymentMethod: 'CREDIT_CARD',
      });

    expect(response.status).to.equal(422);
    expect(response.body).to.have.property('message');
  });

  it('API-VEN-004 | Deve impedir criação de venda com lista de produtos vazia retornando 422', async () => {
    const response = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [], // lista vazia
        paymentMethod: 'CREDIT_CARD',
      });

    expect(response.status).to.equal(422);
    expect(response.body).to.have.property('message');
  });

  it('API-VEN-005 | Deve impedir criação de venda com valor negativo retornando 422', async () => {
    const resposta = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [
          {
            productId,
            quantity: -1, // valor negativo para provocar o erro
          },
        ],
        paymentMethod: 'PIX',
      });

    expect(resposta.status).to.equal(422);
    expect(resposta.body).to.have.property('message');
  });

  it('API-VEN-006 | Deve calcular automaticamente o total da venda retornando 201', async () => {
    const quantidade = 2;
    const precoUnitario = 100;
    const totalEsperado = quantidade * precoUnitario;

    const resposta = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [
          {
            productId,
            quantity: quantidade,
          },
        ],
        paymentMethod: 'PIX',
      });

    expect(resposta.status).to.equal(201);
    expect(resposta.body).to.have.property('id');
    expect(resposta.body).to.have.property('total');
    expect(resposta.body.total).to.equal(totalEsperado);
  });

  it('API-VEN-006B | Deve calcular CMV usando custo automático da ficha técnica', async () => {
    const productWithRecipe = await createProduct({ price: 50, purchase_price: 0 });
    const recipe = await client
      .post('/api/recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Ficha-CMV-${Date.now()}`,
        yield: 10,
        yieldType: 'UN',
        ingredients: [
          { name: 'Ingr1', quantity: 1, packageQuantity: 1, cost: 20 },
        ],
        overhead: 0,
        labor: 0,
        margin: 0,
        linkProductId: productWithRecipe.id,
      });

    expect(recipe.status || 201).to.be.ok;

    const sale = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId: productWithRecipe.id, quantity: 2 }],
        paymentMethod: 'PIX',
      });

    expect(sale.status).to.equal(201);
    const item = sale.body.items && sale.body.items[0];
    expect(item).to.exist;
    const expectedCmv = Number((recipe.body.costPerUnit * 2).toFixed(2));
    expect(item.cmv).to.equal(expectedCmv);
  });

  it('API-VEN-007 | Deve listar todas as vendas cadastradas retornando 200', async () => {
    const resposta = await client
      .get(SALES_PATH)
      .set('Authorization', `Bearer ${token}`);
    expect(resposta.status).to.equal(200);
    expect(resposta.body).to.be.an('array');

    if (resposta.body.length > 0) {
      expect(resposta.body[0]).to.have.property('id');
      expect(resposta.body[0]).to.have.property('total');
    }
  });

  it('API-VEN-008 | Deve buscar uma venda por ID retornando 200', async () => {
    // Arrange — cria uma venda para garantir o ID
    const vendaCriada = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [
          {
            productId,
            quantity: 1,
          },
        ],
        paymentMethod: 'PIX',
      });

    const saleId = vendaCriada.body.id;

    // Act — busca a venda pelo ID
    const resposta = await client
      .get(`${SALES_PATH}/${saleId}`)
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(resposta.status).to.equal(200);
    expect(resposta.body).to.have.property('id', saleId);
    expect(resposta.body).to.have.property('items');
    expect(resposta.body).to.have.property('total');
  });

  it('API-VEN-009 | Deve permitir edição de uma venda ativa', async () => {
    // Arrange — cria venda ativa
    const vendaCriada = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'PIX',
      });

    const saleId = vendaCriada.body.id;

    // Act — edita a venda
    const resposta = await client
      .put(`${SALES_PATH}/${saleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId, quantity: 3 }],
      });

    // Assert
    expect(resposta.status).to.equal(200);
    expect(resposta.body).to.have.property('id', saleId);
    expect(resposta.body.total).to.be.greaterThan(vendaCriada.body.total);
  });

  it('API-VEN-010 | Deve impedir edição de venda cancelada retornando 422', async () => {
    // Arrange — cria venda
    const vendaCriada = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'PIX',
      });

    const saleId = vendaCriada.body.id;

    // Cancela a venda
    await client
      .post(`${SALES_PATH}/${saleId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    // Act — tenta editar venda cancelada
    const resposta = await client
      .put(`${SALES_PATH}/${saleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId, quantity: 2 }],
      });

    // Assert
    expect(resposta.status).to.equal(422);
    expect(resposta.body).to.have.property('message');
  });

  it('API-VEN-011 | Deve permitir cancelar uma venda ativa', async () => {
    // Arrange
    const vendaCriada = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'PIX',
      });

    const saleId = vendaCriada.body.id;

    // Act — cancela a venda
    const resposta = await client
      .post(`${SALES_PATH}/${saleId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(resposta.status).to.equal(200);
    expect(resposta.body).to.have.property('status', 'CANCELED');
  });

  it('API-VEN-012 | Deve impedir cancelamento de venda inexistente', async () => {
    const saleIdInexistente = 999999;

    const resposta = await client
      .post(`${SALES_PATH}/${saleIdInexistente}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).to.equal(404);
    expect(resposta.body).to.have.property('message');
  });

  it('API-VEN-013 | Deve atualizar o faturamento após registro de venda', async () => {
    const faturamentoAntes = await client
      .get('/api/sales/summary')
      .set('Authorization', `Bearer ${token}`);

    await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 2 }],
        paymentMethod: 'PIX',
      });

    const faturamentoDepois = await client
      .get('/api/sales/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(faturamentoDepois.body.total).to.be.greaterThan(faturamentoAntes.body.total);
  });

  it('API-VEN-014 | Deve rejeitar requisição com JSON inválido', async () => {
    const resposta = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('{"customerId":');

    expect(resposta.status).to.equal(400);
  });

  it('API-VEN-015 | Deve ignorar campos extras no payload da venda', async () => {
    const resposta = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'PIX',
        campoInvalido: 'nao deveria existir',
      });

    expect(resposta.status).to.equal(201);
    expect(resposta.body).to.not.have.property('campoInvalido');
  });

  it('API-VEN-016 | Deve decrementar estoque após venda', async () => {
    const produto = await createProduct({ stock: 5 });

    const before = await client
      .get(`/api/products/${produto.id}`)
      .set('Authorization', `Bearer ${token}`);

    const quantidade = 2;
    const venda = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId: produto.id, quantity: quantidade }],
        paymentMethod: 'PIX',
      });

    expect(venda.status).to.equal(201);

    const after = await client
      .get(`/api/products/${produto.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(after.body.stock).to.equal(before.body.stock - quantidade);
  });

  it('API-VEN-017 | Deve impedir venda com estoque insuficiente retornando 422', async () => {
    const produto = await createProduct({ stock: 1 });

    const response = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId: produto.id, quantity: 999999 }],
        paymentMethod: 'PIX',
      });

    expect(response.status).to.equal(422);
    expect(response.body).to.have.property('message');
  });

  it('API-VEN-018 | Deve manter estoque intacto se um item da venda falhar', async () => {
    const produto = await createProduct({ stock: 3 });

    const before = await client
      .get(`/api/products/${produto.id}`)
      .set('Authorization', `Bearer ${token}`);

    const resp = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [
          { productId: produto.id, quantity: 1 },
          { productId: 999999, quantity: 1 }, // força falha em um item
        ],
        paymentMethod: 'PIX',
      });

    expect(resp.status).to.equal(422);

    const after = await client
      .get(`/api/products/${produto.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(after.body.stock).to.equal(before.body.stock);
  });

  it('API-VEN-019 | Deve impedir item com quantidade zero retornando 422', async () => {
    const response = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 0 }],
        paymentMethod: 'PIX',
      });

    expect(response.status).to.equal(422);
    expect(response.body).to.have.property('message');
  });

  it('API-VEN-020 | Deve impedir forma de pagamento inválida retornando 422', async () => {
    const response = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'BOLETO_NAO_SUPORTADO',
      });

    expect(response.status).to.equal(422);
    expect(response.body).to.have.property('message');
  });

  it('API-VEN-021 | Deve rejeitar quantidade acima do limite retornando 422', async () => {
    const response = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 1000001 }],
        paymentMethod: 'PIX',
      });

    expect(response.status).to.equal(422);
  });

  it('API-VEN-022 | Deve registrar usuário responsável ao cancelar venda', async () => {
    const vendaCriada = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'PIX',
      });

    const saleId = vendaCriada.body.id;

    const cancel = await client
      .post(`${SALES_PATH}/${saleId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(cancel.status).to.equal(200);

    const audit = await client
      .get(`${SALES_PATH}/${saleId}/audit`)
      .set('Authorization', `Bearer ${token}`);

    expect(audit.status).to.equal(200);
    expect(audit.body).to.have.property('lastAction', 'CANCELED');
    expect(audit.body).to.have.property('performedBy');
    expect(audit.body.history).to.be.an('array').with.length.greaterThan(1);
    expect(audit.body.history[0].action).to.equal('CREATED');
    expect(audit.body.history[audit.body.history.length - 1].action).to.equal('CANCELED');
  });

  it('API-VEN-023 | Deve permitir editar venda ativa sem reenviar itens (mantendo data original)', async () => {
    const vendaCriada = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 2 }],
        paymentMethod: 'PIX',
      });

    const saleId = vendaCriada.body.id;

    const resposta = await client
      .put(`${SALES_PATH}/${saleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CASH',
      });

    expect(resposta.status).to.equal(200);
    expect(resposta.body).to.have.property('id', saleId);
    expect(resposta.body.items).to.be.an('array').with.length(vendaCriada.body.items.length);
    expect(resposta.body.total).to.equal(vendaCriada.body.total);
  });

  it('API-VEN-024 | Nao deve controlar estoque para produto com estoque alto', async () => {
    const produto = await createProduct({ stock: 50 });

    const before = await client
      .get(`/api/products/${produto.id}`)
      .set('Authorization', `Bearer ${token}`);

    const venda = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId: produto.id, quantity: 20 }],
        paymentMethod: 'PIX',
      });

    expect(venda.status).to.equal(201);

    const after = await client
      .get(`/api/products/${produto.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(after.body.stock).to.equal(before.body.stock);
  });

  it('SEC-VEN-001 | Deve bloquear acesso com token inválido', async () => {
    const resposta = await client
      .get(SALES_PATH)
      .set('Authorization', 'Bearer token_invalido_123');

    expect(resposta.status).to.equal(401);
    expect(resposta.body).to.have.property('message');
  });

  it('SEC-VEN-002 | Deve bloquear acesso com token expirado', async () => {
    const tokenExpirado = process.env.EXPIRED_TOKEN || 'token_expirado_mock';

    const resposta = await client
      .get(SALES_PATH)
      .set('Authorization', `Bearer ${tokenExpirado}`);

    expect(resposta.status).to.equal(401);
    expect(resposta.body).to.have.property('message');
  });

  it('SEC-VEN-003 | Deve impedir edição de venda por outro usuário (IDOR)', async () => {
    // Arrange — cria venda com usuário A
    const vendaCriada = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'PIX',
      });

    const saleId = vendaCriada.body.id;

    // Login com outro usuario
    const outroToken = await loginAndGetToken('other');

    // Act — tenta editar venda
    const resposta = await client
      .put(`${SALES_PATH}/${saleId}`)
      .set('Authorization', `Bearer ${outroToken}`)
      .send({
        items: [{ productId, quantity: 2 }],
      });

    expect(resposta.status).to.equal(403);
    expect(resposta.body).to.have.property('message');
  });

  it('SEC-VEN-004 | Deve impedir cancelamento de venda por outro usuário (IDOR)', async () => {
    // Arrange — cria venda
    const vendaCriada = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'PIX',
      });

    const saleId = vendaCriada.body.id;

    // Login com outro usuario
    const outroToken = await loginAndGetToken('other');

    // Act — tenta cancelar
    const resposta = await client
      .post(`${SALES_PATH}/${saleId}/cancel`)
      .set('Authorization', `Bearer ${outroToken}`);

    expect(resposta.status).to.equal(403);
    expect(resposta.body).to.have.property('message');
  });

  it('SEC-VEN-005 | Deve bloquear SQL Injection nos campos da venda', async () => {
    const resposta = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [
          {
            productId,
            quantity: '1 OR 1=1',
          },
        ],
        paymentMethod: "' OR '1'='1",
      });

    expect(resposta.status).to.equal(422);
    expect(resposta.body).to.have.property('message');
  });

  it('SEC-VEN-006 | Deve bloquear XSS nos campos da venda', async () => {
    const resposta = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [
          {
            productId,
            quantity: 1,
          },
        ],
        paymentMethod: '<script>alert(1)</script>',
      });

    expect(resposta.status).to.equal(422);
    expect(resposta.body).to.have.property('message');
  });

  it('SEC-VEN-007 | Deve bloquear payload gigante (DoS)', async () => {
    const payloadGigante = {
      customerId,
      items: Array(10000).fill({
        productId,
        quantity: 1,
      }),
      paymentMethod: 'PIX',
    };

    const resposta = await client
      .post(SALES_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send(payloadGigante);

    expect([413, 400]).to.include(resposta.status);
  });
});




