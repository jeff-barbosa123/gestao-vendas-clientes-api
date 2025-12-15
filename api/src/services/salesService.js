const { db, createSale } = require('../models/db');
const { parseIsoDate } = require('../utils/dateValidation');

function hasSqlInjectionRisk(value) {
  if (typeof value !== 'string') return false;
  const riskKeywords = /(select|insert|update|delete|drop|truncate|alter)\s+/i;
  return /(--|;)/.test(value) || riskKeywords.test(value);
}

function hasXssRisk(value) {
  if (typeof value !== 'string') return false;
  return /<\s*script[\s>]/i.test(value);
}

function toCents(value, field) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    const err = new Error(`${field || 'Valor'} invalido`);
    err.status = 400;
    throw err;
  }
  return Math.round(num * 100);
}

function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

function validateSaleInput(data) {
  if (!data.customerId) {
    const err = new Error('customerId ? obrigat?rio');
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    const err = new Error('items ? obrigat?rio');
    err.status = 400;
    throw err;
  }

  if (data.items.length > 1000) {
    const err = new Error('Payload muito grande');
    err.status = 413;
    throw err;
  }

  const customer = db.customers.find(c => c.id === data.customerId);
  if (!customer) {
    const err = new Error('Cliente n?o encontrado');
    err.status = 400;
    throw err;
  }

  if (data.date != null) {
    parseIsoDate(data.date, 'date');
  }

  for (const it of data.items) {
    const product = db.products.find(p => p.id === it.productId);

    if (!product) {
      const err = new Error(`Produto ${it.productId} n?o encontrado`);
      err.status = 400;
      throw err;
    }

    const unitPriceRaw = it.unitPrice != null ? Number(it.unitPrice) : Number(product.price);
    if (Number.isNaN(unitPriceRaw) || unitPriceRaw < 0) {
      const err = new Error('Pre?o unit?rio inv?lido');
      err.status = 400;
      throw err;
    }

    const quantityRaw = Number(it.quantity || 1);
    if (!Number.isFinite(quantityRaw) || quantityRaw <= 0) {
      const err = new Error('Quantidade inv?lida');
      err.status = 400;
      throw err;
    }
  }

  if (hasSqlInjectionRisk(data.paymentMethod) || hasXssRisk(data.paymentMethod)) {
    const err = new Error('Forma de pagamento inv?lida');
    err.status = 400;
    throw err;
  }
}

function normalizeItemsWithCosts(items, previousItems = []) {
  const normalized = items.map(it => {
    const product = db.products.find(p => p.id === it.productId);

    if (!product || product.purchase_price == null) {
      const err = new Error(`Produto ${it.productId} n?o possui purchase_price definido.`);
      err.status = 400;
      throw err;
    }

    const previous = previousItems.find(oldIt => oldIt.productId === it.productId);
    const quantity = Number(it.quantity != null ? it.quantity : previous ? previous.quantity : 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      const err = new Error('Quantidade inv?lida');
      err.status = 400;
      throw err;
    }

    const unitPriceRaw =
      it.unitPrice != null
        ? it.unitPrice
        : previous
        ? previous.unitPrice
        : product.price;

    const unitPriceCents = toCents(unitPriceRaw, 'Pre?o unit?rio');
    const purchaseCents = toCents(product.purchase_price, 'purchase_price');

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

function getAll(user) {
  return db.sales.filter(s => !s.ownerId || !user || s.ownerId === user.id);
}

function getById(id, user) {
  const sale = db.sales.find(s => s.id === id);
  if (!sale) {
    const err = new Error('Venda n?o encontrada');
    err.status = 404;
    throw err;
  }
  if (sale.ownerId && user && sale.ownerId !== user.id) {
    const err = new Error('Acesso negado');
    err.status = 403;
    throw err;
  }
  return sale;
}

function create(data, user) {
  validateSaleInput(data);

  const { items, total, cmv } = normalizeItemsWithCosts(data.items);
  const saleDate = data.date ? parseIsoDate(data.date, 'date') : new Date();

  return createSale({
    ...data,
    items,
    cmv,
    total,
    status: 'ACTIVE',
    ownerId: user ? user.id : null,
    date: saleDate.toISOString(),
  });
}

function update(id, data, user) {
  const index = db.sales.findIndex(s => s.id === id);

  if (index === -1) {
    const err = new Error('Venda n?o encontrada');
    err.status = 404;
    throw err;
  }

  const oldSale = db.sales[index];

  if (oldSale.ownerId && user && oldSale.ownerId !== user.id) {
    const err = new Error('Acesso negado');
    err.status = 403;
    throw err;
  }

  if (oldSale.status === 'CANCELED') {
    const err = new Error('Venda cancelada n?o pode ser editada');
    err.status = 400;
    throw err;
  }

  const validationPayload = {
    ...oldSale,
    ...data,
    items: (data.items || oldSale.items).map(it => ({ ...it })),
  };

  validateSaleInput(validationPayload);

  const hasNewItems = Array.isArray(data.items);

  if (!hasNewItems) {
    const updatedDate = data.date ? parseIsoDate(data.date, 'date').toISOString() : oldSale.date;
    db.sales[index] = {
      ...oldSale,
      ...data,
      items: oldSale.items,
      total: oldSale.total,
      cmv: oldSale.cmv,
      date: updatedDate,
    };
    return db.sales[index];
  }

  const { items, total, cmv } = normalizeItemsWithCosts(data.items, oldSale.items);
  const updatedDate = data.date ? parseIsoDate(data.date, 'date').toISOString() : oldSale.date;

  db.sales[index] = {
    ...oldSale,
    ...data,
    items,
    total,
    cmv,
    date: updatedDate,
  };

  return db.sales[index];
}

function cancel(id, user) {
  const index = db.sales.findIndex(s => s.id === id);

  if (index === -1) {
    const err = new Error('Venda n?o encontrada');
    err.status = 404;
    throw err;
  }

  if (db.sales[index].ownerId && user && db.sales[index].ownerId !== user.id) {
    const err = new Error('Acesso negado');
    err.status = 403;
    throw err;
  }

  db.sales[index].status = 'CANCELED';
  db.sales[index].canceledAt = new Date().toISOString();
  return db.sales[index];
}

function summary() {
  const total = db.sales
    .filter(s => s.status !== 'CANCELED')
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
};
