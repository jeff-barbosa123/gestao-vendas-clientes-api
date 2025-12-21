const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@negocio.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const OTHER_USER_EMAIL = process.env.OTHER_USER_EMAIL || "user@negocio.com";
const OTHER_USER_PASSWORD = process.env.OTHER_USER_PASSWORD || "user123";
const PLACEHOLDER_USER_EMAIL = "<EMAIL>".toLowerCase();
const PLACEHOLDER_USER_PASSWORD = "<PASSWORD>";

// Caminho do arquivo fixtures
const customersPath = path.join(__dirname, "../../fixtures/customers.json");
let customersFromFile = [];

try {
  customersFromFile = JSON.parse(fs.readFileSync(customersPath, "utf-8"));
} catch (err) {
  console.warn("Nenhum arquivo customers.json encontrado, iniciando vazio.");
}

// Banco de dados em memoria
const db = {
  users: [
    {
      id: "u1",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: "Admin",
      statusUsuario: "ATIVO",
      dataUltimoLogin: null,
      tentativasFalha: 0,
    },
    {
      id: "u2",
      email: OTHER_USER_EMAIL,
      password: OTHER_USER_PASSWORD,
      name: "User",
      statusUsuario: "ATIVO",
      dataUltimoLogin: null,
      tentativasFalha: 0,
    },
    {
      id: "u3",
      email: PLACEHOLDER_USER_EMAIL,
      password: PLACEHOLDER_USER_PASSWORD,
      name: "Placeholder User",
      statusUsuario: "ATIVO",
      dataUltimoLogin: null,
      tentativasFalha: 0,
    },
    {
      id: "u_block",
      email: "bloqueado@teste.com",
      password: "123456",
      name: "Bloqueado",
      blocked: true,
      statusUsuario: "BLOQUEADO",
      dataUltimoLogin: null,
      tentativasFalha: 0,
    },
  ],
  customers: [...customersFromFile],
  products: [],
  sales: [],
  recipes: [],
};

// Auth tracking
const failedAttempts = new Map();
const tokenStore = new Map();
const refreshStore = new Map();

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
    ownerId: data.ownerId || null,
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

  // price (preco de venda)
  const price = Number(data.price);
  if (Number.isNaN(price) || price < 0) {
    const err = new Error("Pre\u00e7o inv\u00e1lido");
    err.status = 400;
    throw err;
  }

  // purchase_price (preco de compra - obrigatorio)
  if (data.purchase_price == null) {
    const err = new Error("purchase_price \u00e9 obrigat\u00f3rio");
    err.status = 400;
    throw err;
  }

  const purchase_price = Number(data.purchase_price);
  if (Number.isNaN(purchase_price) || purchase_price < 0) {
    const err = new Error("purchase_price inv\u00e1lido");
    err.status = 400;
    throw err;
  }

  const product = {
    id,
    name: data.name,
    description: data.description || data.descricao || null,
    descricao: data.description || data.descricao || null,
    price,
    purchase_price,
    ownerId: data.ownerId || null,
    usuarioId: data.ownerId || null,
    fichaTecnicaId: data.fichaTecnicaId || null,
    custo_por_unidade: data.custo_por_unidade || null,
    preco_minimo: data.preco_minimo || null,
    preco_minimo_sugerido: data.preco_minimo_sugerido || null,
    cmv_previsto: data.cmv_previsto || null,
    cmv_futuro: data.cmv_futuro || null,
    data_vinculo: data.data_vinculo || null,
    statusProduto: data.statusProduto || "ATIVO",
    stock: data.stock != null ? Number(data.stock) : null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    dataCriacao: new Date().toISOString(),
    dataAtualizacao: null,
  };

  db.products.push(product);
  return product;
}

/* ===============================
      CREATE SALE (CMV OK)
================================*/
function createSale(data) {
  const id = uuidv4();
  const saleDate = data.date ? new Date(data.date) : new Date();

  const items = (data.items || []).map(it => ({
    productId: it.productId,
    quantity: Number(it.quantity),
    unitPrice: Number(it.unitPrice),
    cmv: it.cmv,
  }));

  const sale = {
    id,
    customerId: data.customerId,
    customerName: data.customerName || null,
    clienteNome: data.customerName || null,
    ownerId: data.ownerId || null,
    items,
    total: data.total != null ? data.total : items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    cmv: data.cmv,
    date: saleDate.toISOString(),
    status: data.status || "ACTIVE",
    statusVenda: data.statusVenda || (data.status === "CANCELED" ? "cancelada" : "ativa"),
    canceledAt: data.canceledAt || null,
    createdAt: new Date().toISOString(),
  };

  db.sales.push(sale);
  return sale;
}

/* ===============================
      RELATORIO
================================*/
function revenueBetween(startDate, endDate, ownerId) {
  const start = startDate instanceof Date ? startDate : new Date(0);
  const end = endDate instanceof Date ? endDate : new Date();

  return db.sales
    .filter(x => x.status === "ACTIVE")
    .filter(x => !ownerId || x.ownerId === ownerId)
    .filter(x => {
      const dx = new Date(x.date);
      return dx >= start && dx <= end;
    });
}

module.exports = {
  db,
  failedAttempts,
  tokenStore,
  refreshStore,
  createCustomer,
  createProduct,
  createSale,
  revenueBetween,
};
