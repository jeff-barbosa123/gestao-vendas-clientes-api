const { db, createCustomer } = require('../models/db');

function list() {
  return db.customers;
}

function getById(id) {
  const customer = db.customers.find(c => c.id === id);
  if (!customer) {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    throw err;
  }
  return customer;
}

function create(data) {
  if (!data.name || !data.email) {
    const err = new Error('Nome e e-mail são obrigatórios');
    err.status = 400;
    throw err;
  }
  const exists = db.customers.some(c => c.email.toLowerCase() === data.email.toLowerCase());
  if (exists) {
    const err = new Error('E-mail já cadastrado');
    err.status = 409;
    throw err;
  }
  return createCustomer(data);
}

function update(id, data) {
  const index = db.customers.findIndex(c => c.id === id);
  if (index === -1) {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    throw err;
  }
  if (data.email) {
    const exists = db.customers.some(c => c.email.toLowerCase() === data.email.toLowerCase() && c.id !== id);
    if (exists) {
      const err = new Error('E-mail já cadastrado');
      err.status = 409;
      throw err;
    }
  }
  db.customers[index] = { ...db.customers[index], ...data, id };
  return db.customers[index];
}

function remove(id) {
  const index = db.customers.findIndex(c => c.id === id);
  if (index === -1) {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    throw err;
  }
  const [removed] = db.customers.splice(index, 1);
  return removed;
}

module.exports = { list, getById, create, update, remove };

