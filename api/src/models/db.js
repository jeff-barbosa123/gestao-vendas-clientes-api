const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Caminho do arquivo fixtures
const customersPath = path.join(__dirname, '../../fixtures/customers.json');
let customersFromFile = [];

try {
  customersFromFile = JSON.parse(fs.readFileSync(customersPath, 'utf-8'));
} catch (err) {
  console.warn('⚠️ Nenhum arquivo customers.json encontrado, iniciando vazio.');
}

// Banco de dados em memória
const db = {
  users: [
    { id: 'u1', email: 'admin@negocio.com', password: 'admin123', name: 'Admin' },
  ],
  customers: [...customersFromFile],
  products: [],
  sales: [],
  recipes: [],
};

// Auth tracking
const failedAttempts = new Map();
const tokenStore = new Map();

/* ===============================
      CREATE CUSTOMER
================================*/
function createCustomer(data) {
  const id = uuidv4();
  const customer = {
    id,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    createdAt: new Date().toISOString(),
  };

  db.customers.push(customer);

  fs.writeFileSync(customersPath, JSON.stringify(db.customers, null, 2));

  return customer;
}

/* ===============================
      CREATE PRODUCT (CMV OK)
================================*/
function createProduct(data) {
  const id = uuidv4();

  // price (preço de venda)
  const price = Number(data.price);
  if (Number.isNaN(price) || price < 0) {
    const err = new Error('Preço inválido');
    err.status = 400;
    throw err;
  }

  // purchase_price (preço de compra – obrigatório)
  if (data.purchase_price == null) {
    const err = new Error('purchase_price é obrigatório');
    err.status = 400;
    throw err;
  }

  const purchase_price = Number(data.purchase_price);
  if (Number.isNaN(purchase_price) || purchase_price < 0) {
    const err = new Error('purchase_price inválido');
    err.status = 400;
    throw err;
  }

  const product = {
    id,
    name: data.name,
    price,
    purchase_price,
    stock: data.stock != null ? Number(data.stock) : null,
    createdAt: new Date().toISOString(),
  };

  db.products.push(product);
  return product;
}

/* ===============================
      CREATE SALE (CMV OK)
================================*/
function createSale(data) {
  const id = uuidv4();
  const date = data.date ? new Date(data.date) : new Date();

  const items = (data.items || []).map(it => ({
    productId: it.productId,
    quantity: Number(it.quantity),
    unitPrice: Number(it.unitPrice),
    cmv: it.cmv, // ← CMV por item
  }));

  const total = items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0
  );

  const sale = {
    id,
    customerId: data.customerId,
    items,
    total,
    cmv: data.cmv, // ← CMV total
    date: date.toISOString(),
    status: data.status || 'confirmed',
    createdAt: new Date().toISOString(),
  };

  db.sales.push(sale);
  return sale;
}

/* ===============================
      RELATÓRIO
================================*/
function revenueBetween(start, end) {
  const s = start ? new Date(start) : new Date(0);
  const e = end ? new Date(end) : new Date();

  return db.sales
    .filter(x => x.status === 'confirmed')
    .filter(x => {
      const dx = new Date(x.date);
      return dx >= s && dx <= e;
    });
}

module.exports = {
  db,
  failedAttempts,
  tokenStore,
  createCustomer,
  createProduct,
  createSale,
  revenueBetween,
};
