/**
 * Encomendas (pedidos com data de entrega).
 *
 * Status: PENDING (a fazer) -> READY (pronta) -> DELIVERED (entregue), ou CANCELED.
 * Ao entregar, a encomenda vira uma venda: faturamento, CMV e baixa dos insumos acontecem ali,
 * uma vez só. O sinal fica registrado na encomenda e o saldo a receber é mostrado na entrega.
 */
const repo = require("../db/repository");
const ordersRepo = require("../db/ordersRepository");
const salesService = require("./salesService");
const stockService = require("./stockService");

const OPEN = ["PENDING", "READY"];
const STATUS_LABELS = { PENDING: "A fazer", READY: "Pronta", DELIVERED: "Entregue", CANCELED: "Cancelada" };
const MAX_ITEMS = 50;

function fail(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function money(value, label) {
  const n = Number(String(value ?? 0).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) throw fail(`${label} deve ser zero ou maior`);
  return Math.round(n * 100) / 100;
}

function cleanText(value, max, label) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > max) throw fail(`${label} deve ter no máximo ${max} caracteres`);
  if (/<\s*script/i.test(text)) throw fail(`${label} contém conteúdo não permitido`);
  return text;
}

function parseDelivery(value) {
  if (!value) throw fail("Informe a data e a hora da entrega");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw fail("Data de entrega inválida");
  const year = date.getUTCFullYear();
  if (year < 2000 || year > 2100) throw fail("Data de entrega fora do intervalo permitido");
  return date.toISOString();
}

function ensureOwner(order, user) {
  if (!order) throw fail("Encomenda não encontrada", 404);
  if (order.ownerId && user && order.ownerId !== user.id) throw fail("Acesso negado", 403);
}

async function buildPayload(data, user, current = null) {
  const deliveryAt = parseDelivery(data.deliveryAt ?? (current && current.deliveryAt));

  // Cliente: cadastrado (customerId) ou só o nome
  let customerId = data.customerId !== undefined ? data.customerId || null : current ? current.customerId : null;
  let customerName = cleanText(data.customerName ?? (current && current.customerName), 120, "Nome do cliente");
  if (customerId) {
    const customer = await repo.getCustomerById(customerId);
    if (!customer) throw fail("Cliente não encontrado", 404);
    if (customer.owner_id && user && customer.owner_id !== user.id) throw fail("Acesso negado", 403);
    customerName = customerName || customer.name;
  }
  if (!customerId && !customerName) throw fail("Informe o cliente da encomenda");

  const phoneRaw = data.customerPhone !== undefined ? data.customerPhone : current ? current.customerPhone : null;
  const phone = cleanText(phoneRaw, 30, "Telefone");
  if (phone && phone.replace(/\D/g, "").length < 10) throw fail("Telefone deve ter DDD (10 ou 11 dígitos)");

  // Itens: produtos do usuário, ativos; preço padrão = preço do produto
  const rawItems = Array.isArray(data.items) ? data.items : current ? current.items : null;
  if (!Array.isArray(rawItems) || !rawItems.length) throw fail("Adicione pelo menos um produto à encomenda");
  if (rawItems.length > MAX_ITEMS) throw fail(`Encomenda com no máximo ${MAX_ITEMS} itens`);
  const products = await repo.listProducts(user ? user.id : null);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const items = rawItems.map((it) => {
    const product = productMap.get(it.productId);
    if (!product) throw fail("Produto da encomenda não encontrado", 404);
    if (product.owner_id && user && product.owner_id !== user.id) throw fail("Acesso negado", 403);
    const status = String(product.status_produto || product.status || "").toUpperCase();
    if (status === "INATIVO" || status === "INACTIVE") throw fail(`Produto "${product.name}" está inativo`);
    const quantity = Number(String(it.quantity ?? "").replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) throw fail("Quantidade inválida");
    const unitPrice = it.unitPrice != null && it.unitPrice !== "" ? money(it.unitPrice, "Preço do item") : money(product.price, "Preço do produto");
    return { productId: product.id, productName: product.name, quantity, unitPrice };
  });
  const total = Math.round(items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0) * 100) / 100;

  const deposit = money(data.deposit ?? (current ? current.deposit : 0), "Sinal");
  if (deposit > total) throw fail("O sinal não pode ser maior que o total da encomenda");
  let depositMethod = data.depositMethod !== undefined ? data.depositMethod : current ? current.depositMethod : null;
  depositMethod = depositMethod ? salesService.normalizePaymentMethod(depositMethod) : null;
  if (depositMethod && !salesService.allowedPaymentMethods.includes(depositMethod)) throw fail("Forma de pagamento do sinal inválida");

  const notes = cleanText(data.notes !== undefined ? data.notes : current ? current.notes : null, 1000, "Observações");

  return {
    order: { ownerId: user ? user.id : null, customerId, customerName, customerPhone: phone, deliveryAt, deposit, depositMethod, total, notes },
    items,
  };
}

function withLabel(order) {
  return order ? { ...order, statusLabel: STATUS_LABELS[order.status] || order.status } : order;
}

function parseRange(query = {}) {
  const range = {};
  if (query.from) {
    const d = new Date(query.from);
    if (Number.isNaN(d.getTime())) throw fail("Parâmetro from inválido");
    range.from = d.toISOString();
  }
  if (query.to) {
    const d = new Date(query.to);
    if (Number.isNaN(d.getTime())) throw fail("Parâmetro to inválido");
    range.to = d.toISOString();
  }
  if (query.status) {
    const list = String(query.status).toUpperCase().split(",").map((s) => s.trim()).filter(Boolean);
    if (list.some((s) => !STATUS_LABELS[s])) throw fail("Parâmetro status inválido");
    range.status = list;
  }
  return range;
}

async function list(user, query = {}) {
  const orders = await ordersRepo.listOrders(user ? user.id : null, parseRange(query));
  return orders.map(withLabel);
}

async function getById(id, user) {
  const order = await ordersRepo.getOrderById(id);
  ensureOwner(order, user);
  return withLabel(order);
}

async function create(data, user) {
  const { order, items } = await buildPayload(data || {}, user);
  return withLabel(await ordersRepo.createOrder(order, items));
}

async function update(id, data, user) {
  const current = await ordersRepo.getOrderById(id);
  ensureOwner(current, user);
  if (!OPEN.includes(current.status)) throw fail("Encomenda entregue ou cancelada não pode ser alterada", 422);
  const { order, items } = await buildPayload(data || {}, user, current);
  return withLabel(await ordersRepo.updateOrder(id, order, items));
}

/**
 * Muda o status. Entregar (DELIVERED) cria a venda com a forma de pagamento do restante.
 */
async function changeStatus(id, data = {}, user) {
  const current = await ordersRepo.getOrderById(id);
  ensureOwner(current, user);
  const next = String(data.status || "").toUpperCase();
  if (!STATUS_LABELS[next]) throw fail("Status inválido. Use PENDING, READY, DELIVERED ou CANCELED");
  if (!OPEN.includes(current.status)) throw fail(`Encomenda já está ${STATUS_LABELS[current.status].toLowerCase()}`, 422);
  if (next === current.status) return withLabel(current);

  if (next === "DELIVERED") {
    const sale = await salesService.create(
      {
        customerId: current.customerId || undefined,
        clienteNome: current.customerName || undefined,
        paymentMethod: data.paymentMethod || current.depositMethod || undefined,
        items: current.items.map((it) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })),
      },
      user
    );
    const delivered = await ordersRepo.setOrderStatus(id, "DELIVERED", { saleId: sale.id });
    return withLabel({ ...delivered, sale: { id: sale.id, total: sale.total, lowStockIngredients: sale.lowStockIngredients || [] } });
  }

  return withLabel(await ordersRepo.setOrderStatus(id, next));
}

/**
 * O que as encomendas em aberto no período vão consumir de cada insumo, comparado com o estoque.
 * Só insumos com estoque controlado entram na conta de falta.
 */
async function needs(user, query = {}) {
  const range = parseRange(query);
  const orders = await ordersRepo.listOrders(user ? user.id : null, { ...range, status: OPEN });
  const items = orders.flatMap((o) => o.items);
  const products = await repo.listProducts(user ? user.id : null);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const consumption = await stockService.computeConsumption(items, productMap);
  const ingredients = await repo.listIngredients(user ? user.id : null);
  const byId = new Map(ingredients.map((i) => [i.id, i]));

  const list = [];
  for (const [ingredientId, needed] of consumption) {
    const ing = byId.get(ingredientId);
    if (!ing) continue;
    const tracked = ing.stockQuantity != null;
    const missing = tracked ? Math.max(0, needed - ing.stockQuantity) : null;
    list.push({
      ingredientId,
      name: ing.name,
      stockUnit: ing.stockUnit,
      needed: Number(needed.toFixed(3)),
      stockQuantity: ing.stockQuantity,
      tracked,
      missing: missing == null ? null : Number(missing.toFixed(3)),
    });
  }
  list.sort((a, b) => (b.missing || 0) - (a.missing || 0) || a.name.localeCompare(b.name));
  return {
    orders: orders.length,
    ingredients: list,
    shortages: list.filter((i) => i.missing > 0),
  };
}

module.exports = { list, getById, create, update, changeStatus, needs, STATUS_LABELS };
