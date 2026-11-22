const repo = require("../db/repository");
const pdv = require("../db/repositories/pdv");
const permissions = require("./permissions");
const salesService = require("./salesService");
const { withTransaction } = require("../db");

function fail(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

const cents = (v) => Math.round(Number(v) * 100);
const money = (c) => Number((c / 100).toFixed(2));

function parseAmount(value, field, { allowZero = false } = {}) {
  const n = Number(value);
  if (value === "" || value == null || !Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || n > 99999999) {
    throw fail(422, `${field} inválido`);
  }
  return cents(n);
}

const cleanText = (v, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const operatorOf = (user) => user.userId || user.id;
const seesAll = (user) => permissions.can(user.role || "owner", "pdv:manage");

function summarize(register, totals, movements) {
  const cash = (totals.payments.find((p) => p.method === "CASH") || { amount: 0 }).amount;
  const expectedCash = money(cents(register.openingAmount) + cents(cash) + cents(totals.suprimento) - cents(totals.sangria));
  return {
    ...register,
    salesCount: totals.salesCount,
    salesTotal: totals.salesTotal,
    cmv: totals.cmv,
    profit: money(cents(totals.salesTotal) - cents(totals.cmv)),
    payments: totals.payments,
    cashSales: cash,
    suprimento: totals.suprimento,
    sangria: totals.sangria,
    expectedCash,
    movements,
  };
}

async function describe(user, register) {
  const [totals, movements] = await Promise.all([
    pdv.registerTotals(user.id, register.id),
    pdv.listMovements(user.id, register.id),
  ]);
  return summarize(register, totals, movements);
}

async function getSession(user) {
  const register = await pdv.getOpenRegister(user.id, operatorOf(user));
  return { register: register ? await describe(user, register) : null };
}

async function open(user, data) {
  const openingAmount = parseAmount(data.openingAmount ?? 0, "Valor de abertura", { allowZero: true });
  try {
    const register = await pdv.openRegister(user.id, operatorOf(user), money(openingAmount), cleanText(data.note));
    return { register: await describe(user, register) };
  } catch (err) {
    if (err.code === "23505") throw fail(409, "Você já tem um caixa aberto.", "REGISTER_ALREADY_OPEN");
    throw err;
  }
}

async function ownRegister(user, id) {
  const register = await pdv.getRegister(user.id, id);
  if (!register) throw fail(404, "Caixa não encontrado");
  if (register.operatorId !== operatorOf(user) && !seesAll(user)) throw fail(403, "Acesso negado");
  return register;
}

async function addMovement(user, id, data) {
  const type = String(data.type || "").toUpperCase();
  if (!["SANGRIA", "SUPRIMENTO"].includes(type)) throw fail(422, "Tipo inválido (SANGRIA ou SUPRIMENTO)");
  const amount = parseAmount(data.amount, "Valor");
  await ownRegister(user, id);
  const movement = await withTransaction(async (client) => {
    const reg = await pdv.getRegister(user.id, id, { lock: true, client });
    if (reg.status !== "OPEN") throw fail(409, "Caixa fechado.", "REGISTER_CLOSED");
    if (type === "SANGRIA") {
      const totals = await pdv.registerTotals(user.id, id, client);
      const cash = (totals.payments.find((p) => p.method === "CASH") || { amount: 0 }).amount;
      const balance = cents(reg.openingAmount) + cents(cash) + cents(totals.suprimento) - cents(totals.sangria);
      if (amount > balance) throw fail(422, "Sangria maior que o saldo em dinheiro do caixa.");
    }
    return pdv.addMovement(user.id, id, { type, amount: money(amount), reason: cleanText(data.reason) }, operatorOf(user), client);
  });
  return { movement, register: await describe(user, await pdv.getRegister(user.id, id)) };
}

async function close(user, id, data) {
  const counted = parseAmount(data.countedAmount, "Valor contado", { allowZero: true });
  await ownRegister(user, id);
  const closed = await withTransaction(async (client) => {
    const reg = await pdv.getRegister(user.id, id, { lock: true, client });
    if (reg.status !== "OPEN") throw fail(409, "Caixa já fechado.", "REGISTER_CLOSED");
    const totals = await pdv.registerTotals(user.id, id, client);
    const cash = (totals.payments.find((p) => p.method === "CASH") || { amount: 0 }).amount;
    const expected = cents(reg.openingAmount) + cents(cash) + cents(totals.suprimento) - cents(totals.sangria);
    return pdv.closeRegister(
      user.id,
      id,
      operatorOf(user),
      { counted: money(counted), expected: money(expected), difference: money(counted - expected), note: cleanText(data.note) },
      client
    );
  });
  return { register: await describe(user, closed) };
}

async function list(user) {
  const rows = await pdv.listRegisters(user.id, seesAll(user) ? null : operatorOf(user));
  return { registers: rows };
}

async function getRegisterById(user, id) {
  return { register: await describe(user, await ownRegister(user, id)) };
}

function buildPayments(rawPayments, totalCents) {
  if (!Array.isArray(rawPayments) || rawPayments.length === 0 || rawPayments.length > 8) {
    throw fail(422, "Informe as formas de pagamento");
  }
  const byMethod = new Map();
  for (const p of rawPayments) {
    const method = salesService.normalizePaymentMethod(p && p.method);
    if (!salesService.allowedPaymentMethods.includes(method)) throw fail(422, "Forma de pagamento inválida");
    byMethod.set(method, (byMethod.get(method) || 0) + parseAmount(p.amount, "Valor do pagamento"));
  }
  const cashPaid = byMethod.get("CASH") || 0;
  const paid = [...byMethod.values()].reduce((a, b) => a + b, 0);
  const nonCash = paid - cashPaid;
  if (paid < totalCents) throw fail(422, "Pagamento insuficiente", "PAYMENT_INSUFFICIENT");
  if (nonCash > totalCents) throw fail(422, "Pagamentos sem dinheiro excedem o total (não há troco).");
  const change = paid - totalCents;
  return [...byMethod].map(([method, amount]) =>
    method === "CASH"
      ? { method, amount: money(amount - change), received: money(amount), change: money(change) }
      : { method, amount: money(amount) }
  );
}

async function createSale(user, data) {
  const register = await pdv.getOpenRegister(user.id, operatorOf(user));
  if (!register) throw fail(409, "Abra o caixa antes de vender.", "NO_OPEN_REGISTER");
  if (!Array.isArray(data.items) || data.items.length === 0 || data.items.length > 200) throw fail(422, "Adicione itens à venda");

  // Preço sempre vem do cadastro (o balcão não altera preço); a soma em centavos é a mesma do salesService.
  let totalCents = 0;
  const items = [];
  for (const it of data.items) {
    const product = it && (await repo.getProductById(it.productId));
    if (!product || (product.owner_id && product.owner_id !== user.id)) throw fail(422, "Produto não encontrado");
    const quantity = Number(it.quantity == null ? 1 : it.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) throw fail(422, "Quantidade inválida");
    totalCents += Math.round(cents(product.price) * quantity);
    items.push({ productId: product.id, quantity });
  }
  if (totalCents <= 0) throw fail(422, "Total da venda inválido");
  const rows = buildPayments(data.payments, totalCents);

  const sale = await salesService.create(
    {
      items,
      customerId: data.customerId || undefined,
      customerName: cleanText(data.customerName, 120) || undefined,
      paymentMethod: rows.length === 1 ? rows[0].method : "OTHER",
    },
    user,
    { afterCreate: (client, created) => pdv.insertPayments(user.id, created.id, register.id, rows, client) }
  );
  const cash = rows.find((r) => r.method === "CASH");
  return {
    sale: { ...sale, profit: money(cents(sale.total) - cents(sale.cmv)) },
    registerId: register.id,
    payments: rows,
    change: cash ? cash.change : 0,
  };
}

async function searchProducts(user, term) {
  return { products: await pdv.searchProducts(user.id, term) };
}

async function setBarcode(user, productId, value) {
  if (!permissions.can(user.role || "owner", "products:write")) throw fail(403, "Seu perfil não tem permissão para esta ação.");
  const barcode = value == null || value === "" ? null : String(value).trim();
  if (barcode !== null && !/^[0-9A-Za-z._-]{3,64}$/.test(barcode)) throw fail(422, "Código de barras inválido");
  try {
    if (!(await pdv.setProductBarcode(user.id, productId, barcode))) throw fail(404, "Produto não encontrado");
  } catch (err) {
    if (err.code === "23505") throw fail(409, "Este código de barras já está em outro produto.");
    throw err;
  }
  return { productId, barcode };
}

module.exports = {
  getSession,
  open,
  addMovement,
  close,
  list,
  getRegisterById,
  createSale,
  searchProducts,
  setBarcode,
};
