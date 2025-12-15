const { db, createProduct } = require('../models/db');

function getAll() {
  return db.products;
}

function getById(id) {
  const product = db.products.find(p => p.id === id);
  if (!product) {
    const err = new Error('Produto n\u00e3o encontrado');
    err.status = 404;
    throw err;
  }
  return product;
}

function create(data) {
  if (!data.name || data.price == null) {
    const err = new Error('Campos obrigat\u00f3rios ausentes');
    err.status = 400;
    throw err;
  }

  const price = Number(data.price);
  if (Number.isNaN(price) || price < 0) {
    const err = new Error('Pre\u00e7o inv\u00e1lido');
    err.status = 400;
    throw err;
  }

  // purchase_price \u00e9 obrigat\u00f3rio para CMV
  if (data.purchase_price == null) {
    const err = new Error('purchase_price \u00e9 obrigat\u00f3rio');
    err.status = 400;
    throw err;
  }

  const purchase_price = Number(data.purchase_price);
  if (Number.isNaN(purchase_price) || purchase_price < 0) {
    const err = new Error('purchase_price inv\u00e1lido');
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
    const err = new Error('Produto n\u00e3o encontrado');
    err.status = 404;
    throw err;
  }

  if (data.purchase_price != null) {
    const hasLinkedRecipe = db.recipes.some(r => r.linkProductId === id);
    if (hasLinkedRecipe) {
      const err = new Error(
        'purchase_price controlado por ficha t\u00e9cnica vinculada; atualize a receita para recalcular o CMV'
      );
      err.status = 400;
      throw err;
    }
  }

  if (data.price != null) {
    const p = Number(data.price);
    if (Number.isNaN(p) || p < 0) {
      const err = new Error('Pre\u00e7o inv\u00e1lido');
      err.status = 400;
      throw err;
    }
    data.price = p;
  }

  if (data.purchase_price != null) {
    const pp = Number(data.purchase_price);
    if (Number.isNaN(pp) || pp < 0) {
      const err = new Error('purchase_price inv\u00e1lido');
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
    const err = new Error('Produto n\u00e3o encontrado');
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
