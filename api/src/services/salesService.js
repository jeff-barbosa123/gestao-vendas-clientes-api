const { v4: uuidv4 } = require("uuid");
const repo = require("../db/repository");
const { parseIsoDate } = require("../utils/dateValidation");

const auditLog = new Map();
const allowedPaymentMethods = ["PIX", "CREDIT_CARD", "CASH"];

function shouldTrackStock(product) {
  return product && Number.isFinite(product.stock) && product.stock <= 5;
}

function hasSqlInjectionRisk(value) {
  if (typeof value !== "string") return false;
  const riskKeywords = /(select|insert|update|delete|drop|truncate|alter)\s+/i;
  return /(--|;)/.test(value) || riskKeywords.test(value);
}

function hasXssRisk(value) {
  if (typeof value !== "string") return false;
  return /<\s*script[\s>]/i.test(value);
}

function toCents(value, field) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    const err = new Error(`${field || "Valor"} inválido`);
    err.status = 422;
    throw err;
  }
  return Math.round(num * 100);
}

function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

async function loadProductsByIds(ids) {
  const products = await repo.listProducts();
  const map = new Map();
  products.forEach((p) => map.set(p.id, p));
  return map;
}

async function validateSaleInput(data, user, productMap) {
  const rawCustomerName = data.customerName ?? data.clienteNome ?? data.cliente_nome ?? null;
  const customerName = typeof rawCustomerName === "string" ? rawCustomerName.trim() : rawCustomerName;
  if (!Array.isArray(data.items) || data.items.length === 0) {
    const err = new Error("items é obrigatório");
    err.status = 422;
    throw err;
  }

  if (data.items.length > 1000) {
    const err = new Error("Payload muito grande");
    err.status = 413;
    throw err;
  }

  if (data.customerId) {
    const customer = await repo.getCustomerById(data.customerId);
    if (!customer) {
      const err = new Error("Cliente não encontrado");
      err.status = 422;
      throw err;
    }
  }

  if (data.date != null) {
    parseIsoDate(data.date, "date");
  }

  for (const it of data.items) {
    const product = productMap.get(it.productId);

    if (!product) {
      const err = new Error(`Produto ${it.productId} não encontrado`);
      err.status = 422;
      throw err;
    }
    if (product.owner_id && user && product.owner_id !== user.id) {
      const err = new Error("Acesso negado");
      err.status = 403;
      throw err;
    }
    if (product.status_produto && product.status_produto !== "ATIVO") {
      const err = new Error("Produto inativo");
      err.status = 422;
      throw err;
    }

    const unitPriceRaw = it.unitPrice != null ? Number(it.unitPrice) : Number(product.price);
    if (Number.isNaN(unitPriceRaw) || unitPriceRaw < 0) {
      const err = new Error("Preço unitário inválido");
      err.status = 422;
      throw err;
    }

    const quantityRaw = Number(it.quantity || 1);
    if (!Number.isFinite(quantityRaw) || quantityRaw <= 0) {
      const err = new Error("Quantidade inválida");
      err.status = 422;
      throw err;
    }

    if (quantityRaw > 1000000) {
      const err = new Error("Quantidade acima do limite permitido");
      err.status = 422;
      throw err;
    }

    if (shouldTrackStock(product) && product.stock < quantityRaw) {
      const err = new Error("Estoque insuficiente");
      err.status = 422;
      throw err;
    }
  }

  if (data.paymentMethod && !allowedPaymentMethods.includes(data.paymentMethod)) {
    const err = new Error("Forma de pagamento inválida");
    err.status = 422;
    throw err;
  }

  if (hasSqlInjectionRisk(data.paymentMethod) || hasXssRisk(data.paymentMethod)) {
    const err = new Error("Forma de pagamento inválida");
    err.status = 422;
    throw err;
  }
}

function normalizeItemsWithCosts(items, productMap, previousItems = []) {
  const normalized = items.map((it) => {
    const product = productMap.get(it.productId);

    if (!product || product.purchase_price == null) {
      const err = new Error(`Produto ${it.productId} não possui purchase_price definido.`);
      err.status = 422;
      throw err;
    }

    const previous = previousItems.find((oldIt) => oldIt.productId === it.productId);
    const quantity = Number(it.quantity != null ? it.quantity : previous ? previous.quantity : 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      const err = new Error("Quantidade inválida");
      err.status = 422;
      throw err;
    }

    if (quantity > 1000000) {
      const err = new Error("Quantidade acima do limite permitido");
      err.status = 422;
      throw err;
    }

    const unitPriceRaw =
      it.unitPrice != null
        ? it.unitPrice
        : previous
        ? previous.unitPrice
        : product.price;

    const unitPriceCents = toCents(unitPriceRaw, "Preço unitário");
    const purchaseCents = toCents(product.purchase_price, "purchase_price");

    const itemTotalCents = Math.round(unitPriceCents * quantity);
    const cmvCents = Math.round(purchaseCents * quantity);

    return {
      productId: it.productId,
      quantity,
      unitPrice: fromCents(unitPriceCents),
      cmv: fromCents(cmvCents),
      _totalCents: itemTotalCents,
      _cmvCents: cmvCents,
    };
  });

  const totals = normalized.reduce(
    (acc, it) => {
      acc.totalCents += it._totalCents;
      acc.cmvCents += it._cmvCents;
      return acc;
    },
    { totalCents: 0, cmvCents: 0 }
  );

  const cleaned = normalized.map(({ _totalCents, _cmvCents, ...rest }) => rest);

  return {
    items: cleaned,
    total: fromCents(totals.totalCents),
    cmv: fromCents(totals.cmvCents),
  };
}

async function reserveStock(items, productMap) {
  const updates = [];
  for (const it of items) {
    const product = productMap.get(it.productId);
    if (shouldTrackStock(product)) {
      if (product.stock < it.quantity) {
        const err = new Error("Estoque insuficiente");
        err.status = 422;
        throw err;
      }
      updates.push({ product, quantity: it.quantity });
    }
  }

  for (const { product, quantity } of updates) {
    await repo.updateProduct(product.id, { stock: Number(product.stock) - quantity });
  }

  return async () => {
    for (const { product, quantity } of updates) {
      await repo.updateProduct(product.id, { stock: Number(product.stock) + quantity });
    }
  };
}

function logAudit(saleId, action, userId) {
  const now = new Date().toISOString();
  const current = auditLog.get(saleId) || { history: [] };
  const entry = { action, performedBy: userId || null, performedAt: now };
  const history = [...current.history, entry];
  auditLog.set(saleId, {
    saleId,
    lastAction: action,
    performedBy: entry.performedBy,
    performedAt: entry.performedAt,
    history,
  });
}

async function getAudit(saleId) {
  const sale = await repo.getSaleById(saleId);
  if (!sale) {
    const err = new Error("Venda não encontrada");
    err.status = 404;
    throw err;
  }
  return auditLog.get(saleId) || {
    saleId,
    lastAction: "CREATED",
    performedBy: null,
    performedAt: sale.date,
    history: [],
  };
}

async function getAll(user) {
  const sales = await repo.listSales(user ? user.id : null);
  return sales.map((s) => ({
    ...s,
    statusVenda: s.status_venda || (s.status === "CANCELED" ? "cancelada" : "ativa"),
  }));
}

async function getById(id, user) {
  const sale = await repo.getSaleById(id);
  if (!sale) {
    const err = new Error("Venda não encontrada");
    err.status = 404;
    throw err;
  }
  if (sale.owner_id && user && sale.owner_id !== user.id) {
    const err = new Error("Acesso negado");
    err.status = 403;
    throw err;
  }
  return {
    ...sale,
    statusVenda: sale.status_venda || (sale.status === "CANCELED" ? "cancelada" : "ativa"),
  };
}

async function create(data, user) {
  const productMap = await loadProductsByIds(data.items.map((it) => it.productId));
  await validateSaleInput(data, user, productMap);

  const { items, total, cmv } = normalizeItemsWithCosts(data.items, productMap);
  const saleDate = data.date ? parseIsoDate(data.date, "date") : new Date();
  const customerName =
    typeof data.customerName === "string"
      ? data.customerName.trim()
      : typeof data.clienteNome === "string"
      ? data.clienteNome.trim()
      : typeof data.cliente_nome === "string"
      ? data.cliente_nome.trim()
      : data.customerName ?? data.clienteNome ?? data.cliente_nome ?? null;

  const rollbackStock = await reserveStock(items, productMap);

  try {
    const sale = {
      id: uuidv4(),
      customerId: data.customerId,
      customerName,
      items,
      cmv,
      total,
      status: "ACTIVE",
      statusVenda: "ativa",
      ownerId: user ? user.id : null,
      date: saleDate.toISOString(),
    };
    await repo.createSale(sale, items);
    logAudit(sale.id, "CREATED", user ? user.id : null);
    return sale;
  } catch (err) {
    await rollbackStock();
    throw err;
  }
}

async function update(id, data, user) {
  const oldSale = await repo.getSaleById(id);

  if (!oldSale) {
    const err = new Error("Venda não encontrada");
    err.status = 404;
    throw err;
  }

  if (oldSale.owner_id && user && oldSale.owner_id !== user.id) {
    const err = new Error("Acesso negado");
    err.status = 403;
    throw err;
  }

  if (oldSale.status === "CANCELED") {
    const err = new Error("Venda cancelada não pode ser editada");
    err.status = 422;
    throw err;
  }

  const validationPayload = {
    ...oldSale,
    ...data,
    date: data.date ?? null,
    items: (data.items || oldSale.items).map((it) => ({ ...it })),
  };

  const productMap = await loadProductsByIds(validationPayload.items.map((it) => it.productId));
  await validateSaleInput(validationPayload, user, productMap);

  const hasNewItems = Array.isArray(data.items);

  if (!hasNewItems) {
    const updatedDate = data.date ? parseIsoDate(data.date, "date").toISOString() : oldSale.date;
    const updated = await repo.updateSale(id, {
      ...oldSale,
      ...data,
      date: updatedDate,
    });
    return {
      ...updated,
      items: oldSale.items,
      total: oldSale.total,
      cmv: oldSale.cmv,
    };
  }

  const { items, total, cmv } = normalizeItemsWithCosts(data.items, productMap, oldSale.items);
  const updatedDate = data.date ? parseIsoDate(data.date, "date").toISOString() : oldSale.date;

  await repo.updateSale(id, {
    ...oldSale,
    ...data,
    total,
    cmv,
    date: updatedDate,
  }, items);
  logAudit(id, "UPDATED", user ? user.id : null);

  return {
    ...oldSale,
    ...data,
    items,
    total,
    cmv,
    date: updatedDate,
  };
}

async function cancel(id, user) {
  const sale = await repo.getSaleById(id);

  if (!sale) {
    const err = new Error("Venda não encontrada");
    err.status = 404;
    throw err;
  }

  if (sale.owner_id && user && sale.owner_id !== user.id) {
    const err = new Error("Acesso negado");
    err.status = 403;
    throw err;
  }

  await repo.updateSale(id, {
    status: "CANCELED",
    statusVenda: "cancelada",
    canceledAt: new Date().toISOString(),
  });

  logAudit(id, "CANCELED", user ? user.id : null);
  return repo.getSaleById(id);
}

async function summary() {
  const sales = await repo.listSales();
  const total = sales
    .filter((s) => s.status !== "CANCELED")
    .reduce((sum, s) => sum + (s.total || 0), 0);
  return { total: Number(total.toFixed(2)) };
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  cancel,
  summary,
  getAudit,
};

