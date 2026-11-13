const { v4: uuidv4 } = require("uuid");
const repo = require("../db/repository");
const stockService = require("./stockService");
const { logError } = require("../utils/logger");

const { withTransaction } = require("../db");

// Estoque de insumos não derruba a venda, mas também não deixa baixa pela metade:
// roda num SAVEPOINT; se falhar, desfaz só essa parte, registra e a venda segue.
// (Sem o savepoint, um erro de SQL marcaria a transação inteira como abortada.)
let savepointSeq = 0;
async function safeStock(label, client, fn) {
  const sp = `sp_stock_${++savepointSeq}`;
  await client.query(`SAVEPOINT ${sp}`);
  try {
    const result = await fn();
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    return result;
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    logError({ event: "STOCK_UPDATE_FAILED", message: `${label}: ${err.message}` });
    return null;
  }
}
const { parseIsoDate } = require("../utils/dateValidation");

const auditLog = new Map();
const allowedPaymentMethods = ["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH", "OTHER"];
// Aceita também os nomes em português usados no balcão
const PAYMENT_ALIASES = {
  DINHEIRO: "CASH",
  ESPECIE: "CASH",
  CREDITO: "CREDIT_CARD",
  CARTAO: "CREDIT_CARD",
  CARTAO_CREDITO: "CREDIT_CARD",
  DEBITO: "DEBIT_CARD",
  CARTAO_DEBITO: "DEBIT_CARD",
  OUTRO: "OTHER",
};

function normalizePaymentMethod(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return value;
  const key = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return PAYMENT_ALIASES[key] || key;
}

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

  if (data.paymentMethod && !allowedPaymentMethods.includes(normalizePaymentMethod(data.paymentMethod))) {
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

// Baixa o estoque dos produtos DENTRO da transação da venda. Cada baixa é um UPDATE atômico
// condicionado ao saldo (sem ler-e-gravar), então vendas simultâneas não vendem o mesmo estoque
// duas vezes. Se faltar saldo, lança 422 e a transação inteira é desfeita (rollback).
async function reserveStock(items, productMap, client) {
  const wanted = new Map(); // productId -> quantidade total (mesmo produto em 2 itens soma)
  for (const it of items) {
    const product = productMap.get(it.productId);
    if (shouldTrackStock(product)) {
      wanted.set(product.id, (wanted.get(product.id) || 0) + Number(it.quantity));
    }
  }

  // Ordem fixa por id evita deadlock entre vendas simultâneas
  const ordered = [...wanted].sort(([a], [b]) => String(a).localeCompare(String(b)));
  for (const [productId, quantity] of ordered) {
    const left = await repo.adjustProductStock(productId, -quantity, client);
    if (left === null) {
      const err = new Error("Estoque insuficiente");
      err.status = 422;
      throw err;
    }
  }
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

// Formato único de resposta de venda: mantém os campos do banco e expõe aliases
// em camelCase/pt-BR usados pelo frontend e pelos testes (clienteNome, customerName...)
function formatSale(s) {
  const customerName = s.customer_name ?? s.customerName ?? null;
  return {
    ...s,
    customerId: s.customer_id ?? s.customerId ?? null,
    paymentMethod: s.payment_method ?? s.paymentMethod ?? null,
    customerName,
    clienteNome: customerName,
    statusVenda: s.status_venda || s.statusVenda || (s.status === "CANCELED" ? "cancelada" : "ativa"),
  };
}

async function getAll(user, pagination = null) {
  const result = await repo.listSales(user ? user.id : null, pagination);
  
  // Se tem paginação, retorna formato paginado
  if (pagination && result.total !== undefined) {
    const sales = result.rows.map(formatSale);
    
    const { createPaginatedResponse } = require('../utils/pagination');
    return createPaginatedResponse(sales, result.total, pagination.page, pagination.limit);
  }
  
  // Sem paginação (backward compatibility)
  const sales = Array.isArray(result) ? result : result.rows || [];
  return sales.map(formatSale);
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
  return formatSale(sale);
}

async function create(data, user) {
  const productMap = await loadProductsByIds(
    // items ausente/inválido não pode estourar aqui (500): o validateSaleInput responde 422
    Array.isArray(data.items) ? data.items.map((it) => it && it.productId) : []
  );
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

  const sale = {
    id: uuidv4(),
    customerId: data.customerId,
    customerName,
    clienteNome: customerName,
    paymentMethod: normalizePaymentMethod(data.paymentMethod),
    items,
    cmv,
    total,
    status: "ACTIVE",
    statusVenda: "ativa",
    ownerId: user ? user.id : null,
    date: saleDate.toISOString(),
  };

  // Tudo ou nada: baixa de produtos + venda + baixa de insumos na mesma transação.
  // Qualquer erro (ex.: estoque insuficiente) desfaz tudo automaticamente.
  const lowStock = await withTransaction(async (client) => {
    await reserveStock(items, productMap, client);
    await repo.createSale(sale, items, client);
    return safeStock("venda", client, () =>
      stockService.applySale(sale.id, items, productMap, user, client)
    );
  });

  logAudit(sale.id, "CREATED", user ? user.id : null);
  return lowStock && lowStock.length ? { ...sale, lowStockIngredients: lowStock } : sale;
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
      paymentMethod: normalizePaymentMethod(data.paymentMethod) ?? oldSale.payment_method ?? null,
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

  await withTransaction(async (client) => {
    await repo.updateSale(id, {
      ...oldSale,
      ...data,
      paymentMethod: normalizePaymentMethod(data.paymentMethod) ?? oldSale.payment_method ?? null,
      total,
      cmv,
      date: updatedDate,
    }, items, client);
    // Itens mudaram: devolve o que a venda tinha descontado e desconta de novo pelos itens atuais
    await safeStock("edição de venda", client, async () => {
      await stockService.reverseSale(id, user, client);
      await stockService.applySale(id, items, productMap, user, client);
    });
  });
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

  const alreadyCanceled = sale.status === "CANCELED" || sale.status_venda === "cancelada";
  await withTransaction(async (client) => {
    await repo.updateSale(
      id,
      {
        status: "CANCELED",
        statusVenda: "cancelada",
        canceledAt: new Date().toISOString(),
      },
      undefined,
      client
    );
    if (!alreadyCanceled) {
      await safeStock("cancelamento de venda", client, () =>
        stockService.reverseSale(id, user, client)
      );
    }
  });

  logAudit(id, "CANCELED", user ? user.id : null);
  return repo.getSaleById(id);
}

async function summary(user) {
  // Somente vendas do usuário autenticado (antes somava vendas de todos os usuários)
  const sales = await repo.listSales(user ? user.id : null);
  const total = sales
    .filter((s) => s.status !== "CANCELED" && s.status_venda !== "cancelada")
    .reduce((sum, s) => sum + (s.total || 0), 0);
  return { total: Number(total.toFixed(2)) };
}

module.exports = {
  normalizePaymentMethod,
  allowedPaymentMethods,
  getAll,
  getById,
  create,
  update,
  cancel,
  summary,
  getAudit,
};

