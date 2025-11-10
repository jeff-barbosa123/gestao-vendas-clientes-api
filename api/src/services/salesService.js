const { db, createSale } = require('../models/db');

function validateSaleInput(data) {
  if (!data.customerId) {
    const err = new Error('Cliente é obrigatório');
    err.status = 400; throw err;
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    const err = new Error('Pelo menos um item de produto é obrigatório');
    err.status = 400; throw err;
  }
  const customer = db.customers.find(c => c.id === data.customerId);
  if (!customer) { const err = new Error('Cliente não encontrado'); err.status = 404; throw err; }
  for (const it of data.items) {
    const product = db.products.find(p => p.id === it.productId);
    if (!product) { const err = new Error(`Produto ${it.productId} não encontrado`); err.status = 404; throw err; }
    const unitPrice = it.unitPrice != null ? Number(it.unitPrice) : Number(product.price);
    if (Number.isNaN(unitPrice) || unitPrice < 0) { const err = new Error('Preço unitário inválido'); err.status = 400; throw err; }
    it.unitPrice = unitPrice;
    it.quantity = Number(it.quantity || 1);
    if (!Number.isFinite(it.quantity) || it.quantity <= 0) { const err = new Error('Quantidade inválida'); err.status = 400; throw err; }
  }
}

function list() {
  return db.sales;
}

function getById(id) {
  const sale = db.sales.find(s => s.id === id);
  if (!sale) { const err = new Error('Venda não encontrada'); err.status = 404; throw err; }
  return sale;
}

function create(data) {
  validateSaleInput(data);
  return createSale({ ...data, status: 'confirmed' });
}

function update(id, data) {
  const index = db.sales.findIndex(s => s.id === id);
  if (index === -1) { const err = new Error('Venda não encontrada'); err.status = 404; throw err; }
  if (db.sales[index].status === 'canceled') { const err = new Error('Venda cancelada não pode ser editada'); err.status = 422; throw err; }
  if (data.items || data.customerId || data.date) {
    validateSaleInput({ ...db.sales[index], ...data });
    // recompute total
    const items = (data.items || db.sales[index].items).map(it => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) }));
    const total = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    db.sales[index] = { ...db.sales[index], ...data, items, total };
  } else {
    db.sales[index] = { ...db.sales[index], ...data };
  }
  return db.sales[index];
}

function cancel(id) {
  const index = db.sales.findIndex(s => s.id === id);
  if (index === -1) { const err = new Error('Venda não encontrada'); err.status = 404; throw err; }
  db.sales[index].status = 'canceled';
  return db.sales[index];
}

module.exports = { list, getById, create, update, cancel };

