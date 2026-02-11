/**
 * Testes de Integração - Paginação
 * 
 * Valida que todas as listagens suportam paginação correta
 */

const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

describe('US999 - Paginação em Listagens', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Criar usuário de teste
    const email = `test-pagination-${Date.now()}@example.com`;
    const password = 'Test@123456';
    const hashedPassword = await require('bcrypt').hash(password, 12);

    const userResult = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email',
      [email, hashedPassword, 'Test User Pagination']
    );
    userId = userResult.rows[0].id;

    // Gerar token
    const payload = {
      userId: userId,
      email: email,
      jti: `test-${Date.now()}`,
    };
    authToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    // Registrar token
    const { tokenStore } = require('../../src/models/db');
    tokenStore.set(payload.jti, {
      userId,
      email,
      revoked: false,
      lastActivity: Date.now(),
    });

    // Criar dados de teste
    await pool.query(
      `INSERT INTO customers (owner_id, name, email, phone) 
       SELECT $1, 'Cliente ' || generate_series, 'cliente' || generate_series || '@test.com', '11999999999'
       FROM generate_series(1, 25)`,
      [userId]
    );

    await pool.query(
      `INSERT INTO products (owner_id, name, purchase_price, sale_price) 
       SELECT $1, 'Produto ' || generate_series, 10.0, 20.0
       FROM generate_series(1, 30)`,
      [userId]
    );
  });

  afterAll(async () => {
    // Limpar dados de teste
    await pool.query('DELETE FROM customers WHERE owner_id = $1', [userId]);
    await pool.query('DELETE FROM products WHERE owner_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.end();
  });

  describe('GET /api/customers - Paginação', () => {
    it('deve retornar dados paginados com metadados corretos', async () => {
      const response = await request(app)
        .get('/api/customers?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('hasNextPage');
      expect(response.body.pagination).toHaveProperty('hasPreviousPage');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeLessThanOrEqual(10);
    });

    it('deve retornar segunda página corretamente', async () => {
      const response = await request(app)
        .get('/api/customers?page=2&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.hasPreviousPage).toBe(true);
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('deve validar parâmetros de paginação inválidos', async () => {
      const response = await request(app)
        .get('/api/customers?page=0&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code');
    });

    it('deve limitar máximo de itens por página', async () => {
      const response = await request(app)
        .get('/api/customers?page=1&limit=200')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.code).toBe('INVALID_LIMIT');
    });

    it('deve funcionar sem parâmetros de paginação (backward compatibility)', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Pode retornar array direto ou formato paginado
      expect(Array.isArray(response.body) || response.body.items).toBeTruthy();
    });
  });

  describe('GET /api/products - Paginação', () => {
    it('deve retornar produtos paginados', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=15')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(15);
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('GET /api/sales - Paginação', () => {
    it('deve retornar vendas paginadas', async () => {
      // Criar algumas vendas de teste
      const customerResult = await pool.query(
        'SELECT id FROM customers WHERE owner_id = $1 LIMIT 1',
        [userId]
      );
      const productResult = await pool.query(
        'SELECT id FROM products WHERE owner_id = $1 LIMIT 1',
        [userId]
      );

      if (customerResult.rows.length > 0 && productResult.rows.length > 0) {
        const customerId = customerResult.rows[0].id;
        const productId = productResult.rows[0].id;

        // Criar 5 vendas
        for (let i = 0; i < 5; i++) {
          await pool.query(
            `INSERT INTO sales (owner_id, customer_id, date, total, status)
             VALUES ($1, $2, NOW(), 100.0, 'ACTIVE') RETURNING id`,
            [userId, customerId]
          );
        }

        const response = await request(app)
          .get('/api/sales?page=1&limit=3')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('items');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.items.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('Validação de Mensagens de Erro na Paginação', () => {
    it('deve retornar mensagem amigável para página inválida', async () => {
      const response = await request(app)
        .get('/api/customers?page=-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).not.toMatch(/INVALID_PAGE|invalid/i);
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
    });

    it('deve retornar mensagem amigável para limite inválido', async () => {
      const response = await request(app)
        .get('/api/customers?limit=500')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).not.toMatch(/INVALID_LIMIT|invalid/i);
      expect(typeof response.body.message).toBe('string');
    });
  });
});
