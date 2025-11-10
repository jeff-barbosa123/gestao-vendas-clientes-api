const { db, createProduct } = require('../models/db');

function list() {
  return db.products;
}

function getById(id) {
  const product = db.products.find(p => p.id === id);
  if (!product) {
    const err = new Error('Produto não encontrado');
    err.status = 404;
    throw err;
  }
  return product;
}

function create(data) {
  if (!data.name || data.price == null) {
    const err = new Error('Nome e preço são obrigatórios');
    err.status = 400;
    throw err;
  }
  const price = Number(data.price);
  if (Number.isNaN(price) || price < 0) {
    const err = new Error('Preço inválido');
    err.status = 400;
    throw err;
  }
  return createProduct({ ...data, price });
}

function update(id, data) {
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) {
    const err = new Error('Produto não encontrado');
    err.status = 404;
    throw err;
  }
  if (data.price != null) {
    const price = Number(data.price);
    if (Number.isNaN(price) || price < 0) {
      const err = new Error('Preço inválido');
      err.status = 400;
      throw err;
    }
    data.price = price;
  }
  db.products[index] = { ...db.products[index], ...data, id };
  return db.products[index];
}

function remove(id) {
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) {
    const err = new Error('Produto não encontrado');
    err.status = 404;
    throw err;
  }
  const [removed] = db.products.splice(index, 1);
  return removed;
}

module.exports = { list, getById, create, update, remove };

