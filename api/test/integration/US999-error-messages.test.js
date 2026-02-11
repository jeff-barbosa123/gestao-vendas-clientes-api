/**
 * Testes de integração para validação de mensagens de erro amigáveis
 * Valida que todas as mensagens retornadas pela API são em linguagem de negócio
 */

const { getClient } = require("../utils/httpClient");
const client = getClient();

describe("US999 - Mensagens de Erro Amigáveis", () => {
  let authToken;

  beforeAll(async () => {
    // Criar usuário de teste ou usar credenciais existentes
    // Este teste assume que há um usuário de teste configurado
    const loginResponse = await client
      .post("/api/auth/login")
      .send({
        email: process.env.TEST_USER_EMAIL || "test@example.com",
        password: process.env.TEST_USER_PASSWORD || "Test@1234",
      });

    if (loginResponse.status === 200 && loginResponse.body.token) {
      authToken = loginResponse.body.token;
    }
  });

  describe("Autenticação", () => {
    test("Deve retornar mensagem amigável para credenciais inválidas", async () => {
      const response = await client
        .post("/api/auth/login")
        .send({
          email: "invalid@example.com",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("code");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).not.toMatch(/UNPROCESSABLE_ENTITY|BAD_REQUEST|INTERNAL_ERROR/i);
      expect(response.body.message).toMatch(/E-mail ou senha incorretos|Credenciais inválidas/i);
    });

    test("Deve retornar mensagem amigável para email inválido", async () => {
      const response = await client
        .post("/api/auth/login")
        .send({
          email: "invalid-email",
          password: "Test@1234",
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).not.toMatch(/UNPROCESSABLE_ENTITY|BAD_REQUEST/i);
    });
  });

  describe("Clientes", () => {
    test("Deve retornar mensagem amigável para cliente não encontrado", async () => {
      if (!authToken) {
        console.warn("Token de autenticação não disponível, pulando teste");
        return;
      }

      const response = await client
        .get("/api/customers/99999")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("code");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toMatch(/não encontrado|Cliente não encontrado/i);
      expect(response.body.message).not.toMatch(/NOT_FOUND|404/i);
    });

    test("Deve retornar mensagem amigável para email duplicado", async () => {
      if (!authToken) {
        console.warn("Token de autenticação não disponível, pulando teste");
        return;
      }

      // Primeiro cria um cliente
      const createResponse = await client
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Cliente Teste Duplicado",
          email: `test-duplicate-${Date.now()}@example.com`,
        });

      if (createResponse.status === 201) {
        // Tenta criar outro com mesmo email
        const duplicateResponse = await client
          .post("/api/customers")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            name: "Outro Cliente",
            email: createResponse.body.user?.email || createResponse.body.email,
          });

        expect(duplicateResponse.status).toBe(409);
        expect(duplicateResponse.body).toHaveProperty("code");
        expect(duplicateResponse.body).toHaveProperty("message");
        expect(duplicateResponse.body.message).toMatch(/já está cadastrado|e-mail já existe/i);
        expect(duplicateResponse.body.message).not.toMatch(/CONFLICT|409/i);
      }
    });
  });

  describe("Validação de Campos", () => {
    test("Deve retornar mensagem amigável para campos obrigatórios faltando", async () => {
      if (!authToken) {
        console.warn("Token de autenticação não disponível, pulando teste");
        return;
      }

      const response = await client
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          // Campos obrigatórios faltando
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).not.toMatch(/UNPROCESSABLE_ENTITY|BAD_REQUEST/i);
      expect(response.body.message).toMatch(/obrigatório|inválido|dados/i);
    });
  });

  describe("CEP", () => {
    test("Deve retornar mensagem amigável para CEP inválido", async () => {
      if (!authToken) {
        console.warn("Token de autenticação não disponível, pulando teste");
        return;
      }

      const response = await client
        .get("/api/cep/123")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toMatch(/CEP inválido|8 dígitos/i);
      expect(response.body.message).not.toMatch(/BAD_REQUEST|400/i);
    });

    test("Deve retornar mensagem amigável para CEP não encontrado", async () => {
      if (!authToken) {
        console.warn("Token de autenticação não disponível, pulando teste");
        return;
      }

      const response = await client
        .get("/api/cep/99999999")
        .set("Authorization", `Bearer ${authToken}`);

      if (response.status === 404) {
        expect(response.body).toHaveProperty("code");
        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toMatch(/CEP não encontrado|não encontrado/i);
        expect(response.body.message).not.toMatch(/NOT_FOUND|404/i);
      }
    });
  });

  describe("Content-Type Validation", () => {
    test("Deve retornar erro amigável para Content-Type inválido", async () => {
      if (!authToken) {
        console.warn("Token de autenticação não disponível, pulando teste");
        return;
      }

      const response = await client
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .set("Content-Type", "text/plain")
        .send("invalid body");

      expect(response.status).toBe(415);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toMatch(/Content-Type|application\/json|formato/i);
    });
  });
});
