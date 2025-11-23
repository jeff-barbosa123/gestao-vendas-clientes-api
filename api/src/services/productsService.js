const { db, createProduct } = require('../models/db');


function getAll() {
  return db.products;
}

function getById(id) {
  return db.products.find(p => p.id === id) || null;
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

  // purchase_price obrigatório para CMV
  if (data.purchase_price == null) {
    const err = new Error('purchase_price é obrigatório');
    err.status = 400;
    throw err;
  }

  const purchase_price = Number(data.purchase_price);
  if (Number.isNaN(purchase_price) || purchase_price < 0) {
    const err = new Error('purchase_price inválido');
    err.status = 400;
    throw err;
  }

  return createProduct({
    ...data,
    price,
    purchase_price,
  });
}

function update(id, data) {
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) {
    const err = new Error('Produto não encontrado');
    err.status = 404;
    throw err;
  }

  if (data.price != null) {
    const p = Number(data.price);
    if (Number.isNaN(p) || p < 0) {
      const err = new Error('Preço inválido');
      err.status = 400;
      throw err;
    }
    data.price = p;
  }

  if (data.purchase_price != null) {
    const pp = Number(data.purchase_price);
    if (Number.isNaN(pp) || pp < 0) {
      const err = new Error('purchase_price inválido');
      err.status = 400;
      throw err;
    }
    data.purchase_price = pp;
  }

  db.products[index] = {
    ...db.products[index],
    ...data,
    id,
  };

  return db.products[index];
}

function remove(id) {
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) {
    const err = new Error('Produto não encontrado');
    err.status = 404;
    throw err;
  }
  return db.products.splice(index, 1)[0];
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
