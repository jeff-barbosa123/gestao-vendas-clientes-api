const { db, createCustomer } = require('../models/db');

function normalizeCustomerInput(data) {
  const isString = (value) => typeof value === 'string';
  return {
    ...data,
    name: isString(data.name) ? data.name.trim() : data.name,
    email: isString(data.email) ? data.email.trim() : data.email,
    phone: isString(data.phone) ? data.phone.trim() : data.phone,
  };
}

function list() {
  return db.customers;
}

function getById(id, user) {
  const customer = db.customers.find((c) => c.id === id);
  if (!customer) {
    const err = new Error('Cliente n\u00e3o encontrado');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (customer.ownerId && user && customer.ownerId !== user.id) {
    const err = new Error('Acesso negado');
    err.status = 403;
    err.code = 'ACCESS_DENIED';
    throw err;
  }
  return customer;
}

function validateEmailFormat(email) {
  const strictEmailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return strictEmailRegex.test(String(email));
}

function validateNameLength(name) {
  return typeof name === 'string' ? name.length <= 255 : true;
}

function hasSqlInjectionRisk(value) {
  if (typeof value !== 'string') return false;
  const riskKeywords = /(select|insert|update|delete|drop|truncate|alter)\s+/i;
  return /(--|;)/.test(value) || riskKeywords.test(value);
}

function hasXssRisk(value) {
  if (typeof value !== 'string') return false;
  return /<\s*script[\s>]/i.test(value);
}

function create(data, user) {
  const payload = normalizeCustomerInput(data);

  if (!payload.name || !payload.email) {
    const err = new Error('Campos obrigat\u00f3rios ausentes');
    err.status = 400;
    err.code = 'REQUIRED_FIELDS';
    throw err;
  }

  if (!validateNameLength(payload.name)) {
    const err = new Error('Nome excede o tamanho permitido');
    err.status = 400;
    err.code = 'NAME_TOO_LONG';
    throw err;
  }

  if (hasSqlInjectionRisk(payload.name) || hasXssRisk(payload.name)) {
    const err = new Error('Nome inv\u00e1lido');
    err.status = 400;
    err.code = 'INVALID_NAME';
    throw err;
  }

  if (!validateEmailFormat(payload.email)) {
    const err = new Error('Formato de e-mail inv\u00e1lido');
    err.status = 400;
    err.code = 'INVALID_EMAIL';
    throw err;
  }

  if (hasSqlInjectionRisk(payload.phone) || hasXssRisk(payload.phone)) {
    const err = new Error('Telefone inv\u00e1lido');
    err.status = 400;
    err.code = 'INVALID_PHONE';
    throw err;
  }

  const exists = db.customers.some(
    (c) => c.email.toLowerCase() === payload.email.toLowerCase()
  );
  if (exists) {
    const err = new Error('E-mail j\u00e1 cadastrado');
    err.status = 409;
    err.code = 'EMAIL_ALREADY_EXISTS';
    throw err;
  }

  const created = createCustomer({ ...payload, ownerId: user ? user.id : null });
  return created;
}

function update(id, data, user) {
  const index = db.customers.findIndex((c) => c.id === id);
  if (index === -1) {
    const err = new Error('Cliente n\u00e3o encontrado');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (db.customers[index].ownerId && user && db.customers[index].ownerId !== user.id) {
    const err = new Error('Acesso negado');
    err.status = 403;
    err.code = 'ACCESS_DENIED';
    throw err;
  }

  const payload = normalizeCustomerInput(data);

  if (payload.name && !validateNameLength(payload.name)) {
    const err = new Error('Nome excede o tamanho permitido');
    err.status = 400;
    err.code = 'NAME_TOO_LONG';
    throw err;
  }

  if (payload.name && (hasSqlInjectionRisk(payload.name) || hasXssRisk(payload.name))) {
    const err = new Error('Nome inv\u00e1lido');
    err.status = 400;
    err.code = 'INVALID_NAME';
    throw err;
  }

  if (payload.phone && (hasSqlInjectionRisk(payload.phone) || hasXssRisk(payload.phone))) {
    const err = new Error('Telefone inv\u00e1lido');
    err.status = 400;
    err.code = 'INVALID_PHONE';
    throw err;
  }

  if (payload.email) {
    if (!validateEmailFormat(payload.email)) {
      const err = new Error('Formato de e-mail inv\u00e1lido');
      err.status = 400;
      err.code = 'INVALID_EMAIL';
      throw err;
    }
    const exists = db.customers.some(
      (c) => c.email.toLowerCase() === payload.email.toLowerCase() && c.id !== id
    );
    if (exists) {
      const err = new Error('E-mail j\u00e1 cadastrado');
      err.status = 409;
      err.code = 'EMAIL_ALREADY_EXISTS';
      throw err;
    }
  }

  db.customers[index] = { ...db.customers[index], ...payload, id };
  return db.customers[index];
}

function remove(id, user) {
  const index = db.customers.findIndex((c) => c.id === id);
  if (index === -1) {
    const err = new Error('Cliente n\u00e3o encontrado');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (db.customers[index].ownerId && user && db.customers[index].ownerId !== user.id) {
    const err = new Error('Acesso negado');
    err.status = 403;
    err.code = 'ACCESS_DENIED';
    throw err;
  }
  const [removed] = db.customers.splice(index, 1);
  return removed;
}

module.exports = { list, getById, create, update, remove };
