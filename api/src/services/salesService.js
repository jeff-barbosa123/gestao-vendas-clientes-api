const { db, createSale } = require('../models/db');

/* ========================================
   VALIDAR ENTRADA DA VENDA
======================================== */
function validateSaleInput(data) {
  if (!data.customerId) {
    const err = new Error('customerId é obrigatório');
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    const err = new Error('items é obrigatório');
    err.status = 400;
    throw err;
  }

  const customer = db.customers.find(c => c.id === data.customerId);
  if (!customer) {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    throw err;
  }

  for (const it of data.items) {
    const product = db.products.find(p => p.id === it.productId);

    if (!product) {
      const err = new Error(`Produto ${it.productId} não encontrado`);
      err.status = 404;
      throw err;
    }

    const unitPrice =
      it.unitPrice != null ? Number(it.unitPrice) : Number(product.price);

    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      const err = new Error('Preço unitário inválido');
      err.status = 400;
      throw err;
    }

    it.unitPrice = unitPrice;

    it.quantity = Number(it.quantity || 1);
    if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
      const err = new Error('Quantidade inválida');
      err.status = 400;
      throw err;
    }
  }
}

/* ========================================
   LISTAR TODAS AS VENDAS
======================================== */
function getAll() {
  return db.sales;
}

/* ========================================
   BUSCAR VENDA POR ID
======================================== */
function getById(id) {
  const sale = db.sales.find(s => s.id === id);
  if (!sale) {
    const err = new Error('Venda não encontrada');
    err.status = 404;
    throw err;
  }
  return sale;
}

/* ========================================
   CRIAR VENDA + CMV TOTAL
======================================== */
function create(data) {
  validateSaleInput(data);

  const itemsWithCMV = data.items.map(it => {
    const product = db.products.find(p => p.id === it.productId);

    if (!product || product.purchase_price == null) {
      const err = new Error(
        `Produto ${it.productId} não possui purchase_price definido.`
      );
      err.status = 400;
      throw err;
    }

    const cmv = product.purchase_price * it.quantity;

    return {
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      cmv,
    };
  });

  const totalCMV = itemsWithCMV.reduce((sum, it) => sum + it.cmv, 0);

  return createSale({
    ...data,
    items: itemsWithCMV,
    cmv: totalCMV,
    status: 'confirmed',
  });
}

/* ========================================
   ATUALIZAR VENDA + RE-CALCULAR CMV
======================================== */
function update(id, data) {
  const index = db.sales.findIndex(s => s.id === id);

  if (index === -1) {
    const err = new Error('Venda não encontrada');
    err.status = 404;
    throw err;
  }

  const oldSale = db.sales[index];

  if (oldSale.status === 'canceled') {
    const err = new Error('Venda cancelada não pode ser editada');
    err.status = 422;
    throw err;
  }

  validateSaleInput({ ...oldSale, ...data });

  const items = (data.items || oldSale.items).map(it => {
    const product = db.products.find(p => p.id === it.productId);

    if (!product || product.purchase_price == null) {
      const err = new Error(
        `Produto ${it.productId} não possui purchase_price definido.`
      );
      err.status = 400;
      throw err;
    }

    const quantity = Number(it.quantity);
    const unitPrice = Number(it.unitPrice);
    const cmv = product.purchase_price * quantity;

    return {
      productId: it.productId,
      quantity,
      unitPrice,
      cmv,
    };
  });

  const total = items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0
  );

  const totalCMV = items.reduce((sum, it) => sum + it.cmv, 0);

  db.sales[index] = {
    ...oldSale,
    ...data,
    items,
    total,
    cmv: totalCMV,
  };

  return db.sales[index];
}

/* ========================================
   CANCELAR VENDA
======================================== */
function cancel(id) {
  const index = db.sales.findIndex(s => s.id === id);

  if (index === -1) {
    const err = new Error('Venda não encontrada');
    err.status = 404;
    throw err;
  }

  db.sales[index].status = 'canceled';
  return db.sales[index];
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  cancel,
};