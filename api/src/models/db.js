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
};

// Auth tracking
const failedAttempts = new Map();
const tokenStore = new Map();

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

  // salva também no arquivo JSON
  fs.writeFileSync(customersPath, JSON.stringify(db.customers, null, 2));

  return customer;
}

function createProduct(data) {
  const id = uuidv4();
  const product = {
    id,
    name: data.name,
    price: Number(data.price),
    stock: data.stock != null ? Number(data.stock) : null,
    createdAt: new Date().toISOString(),
  };
  db.products.push(product);
  return product;
}

function createSale(data) {
  const id = uuidv4();
  const date = data.date ? new Date(data.date) : new Date();
  const items = (data.items || []).map(it => ({
    productId: it.productId,
    quantity: Number(it.quantity || 1),
    unitPrice: Number(it.unitPrice),
  }));
  const total = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const sale = {
    id,
    customerId: data.customerId,
    items,
    total,
    date: date.toISOString(),
    status: data.status || 'confirmed',
    createdAt: new Date().toISOString(),
  };
  db.sales.push(sale);
  return sale;
}

function revenueBetween(start, end) {
  const s = start ? new Date(start) : new Date(0);
  const e = end ? new Date(end) : new Date();
  return db.sales.filter(x => x.status === 'confirmed').filter(x => {
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
