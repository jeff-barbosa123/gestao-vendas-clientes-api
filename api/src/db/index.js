const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const DATABASE_URL = process.env.DATABASE_URL;

// Pool configuration with sensible defaults for production
// Can be overridden via environment variables
// Se DATABASE_URL não estiver configurado, cria pool mock (modo desenvolvimento sem banco)
let pool;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX) || 20, // Maximum number of clients in the pool
    min: Number(process.env.DB_POOL_MIN) || 2,  // Minimum number of clients in the pool
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT) || 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECTION_TIMEOUT) || 2000, // Return an error after 2 seconds if connection cannot be established
    maxUses: Number(process.env.DB_POOL_MAX_USES) || 7500, // Maximum number of uses a client can have before being closed
  });
} else {
  // Modo desenvolvimento sem banco - cria pool mock que lança erro informativo quando usado
  // Em produção, isso nunca deve acontecer (DATABASE_URL é obrigatório)
  if (process.env.NODE_ENV === 'production') {
    throw new Error("DATABASE_URL não configurado - obrigatório em produção");
  }
  
  pool = {
    query: async () => {
      throw new Error('DATABASE_URL não configurado. Configure em .env.local ou remova dependências de banco para usar modo em memória.');
    },
    connect: async () => {
      throw new Error('DATABASE_URL não configurado');
    },
    end: async () => {},
  };
}

const CUSTOMER_COLUMN_UPGRADES = [
  { name: "cnpj", definition: "TEXT" },
  { name: "cpf", definition: "TEXT" },
];

async function query(text, params) {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL não configurado. Configure em .env.local');
  }
  return pool.query(text, params);
}

async function withTransaction(handler) {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL não configurado. Configure em .env.local');
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function ensureCustomerColumns() {
  if (!DATABASE_URL) return;
  
  for (const column of CUSTOMER_COLUMN_UPGRADES) {
    try {
      await pool.query(
        `ALTER TABLE customers ADD COLUMN IF NOT EXISTS ${column.name} ${column.definition}`
      );
    } catch (err) {
      // Ignora erro se coluna já existe
      if (!err.message.includes('already exists')) {
        console.error(`Erro ao adicionar coluna ${column.name}:`, err.message);
      }
    }
  }
}

async function seedDefaults() {
  if (!DATABASE_URL) return;
  
  // Seed padrões se necessário (usuários admin, etc.)
  // Implementação específica depende dos requisitos do sistema
  // Por enquanto, apenas um placeholder
}

async function initDb() {
  // Se não tem DATABASE_URL, pula inicialização do banco
  if (!DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL não configurado - pulando inicialização do banco de dados');
    return;
  }
  
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, "utf8");
      await pool.query(schema);
    }
    await ensureCustomerColumns();
    await seedDefaults();
  } catch (err) {
    // Em desenvolvimento, permite continuar mesmo se banco falhar
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
    console.warn('⚠️  Erro ao inicializar banco de dados:', err.message);
    console.warn('💡 Continuando em modo desenvolvimento sem banco...');
  }
}

module.exports = { pool, query, withTransaction, initDb };