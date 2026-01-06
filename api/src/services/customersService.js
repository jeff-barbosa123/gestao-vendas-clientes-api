const repo = require("../db/repository");

function normalizeCustomerInput(data) {
  const isString = (value) => typeof value === "string";
  const normalizeOptional = (value) => {
    if (!isString(value)) return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };
  const normalizeDigits = (value) => {
    if (!isString(value)) return value;
    const digits = value.replace(/\D/g, "");
    return digits === "" ? null : digits;
  };
  return {
    ...data,
    name: isString(data.name) ? data.name.trim() : data.name,
    email: isString(data.email) ? data.email.trim() : data.email,
    phone: normalizeOptional(data.phone),
    cnpj: normalizeDigits(data.cnpj),
    cpf: normalizeDigits(data.cpf),
    birthDate: normalizeOptional(data.birthDate),
    addressStreet: normalizeOptional(data.addressStreet),
    addressNumber: normalizeOptional(data.addressNumber),
    addressNeighborhood: normalizeOptional(data.addressNeighborhood),
    addressCity: normalizeOptional(data.addressCity),
    addressPostalCode: normalizeOptional(data.addressPostalCode),
    notes: normalizeOptional(data.notes),
  };
}

function safeCustomerString(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function safeCustomerField(customer, field, fallbackField) {
  const primary = safeCustomerString(customer[field]);
  if (primary !== "") {
    return primary;
  }
  if (fallbackField) {
    return safeCustomerString(customer[fallbackField]);
  }
  return primary;
}

function normalizeCustomerOutput(customer) {
  if (!customer) return customer;
  const normalizedNotes = safeCustomerString(customer.notes || customer.note);
  return {
    ...customer,
    name: safeCustomerField(customer, "name"),
    email: safeCustomerField(customer, "email"),
    phone: safeCustomerField(customer, "phone"),
    cnpj: safeCustomerField(customer, "cnpj"),
    cpf: safeCustomerField(customer, "cpf"),
    birth_date: safeCustomerField(customer, "birth_date", "birthDate"),
    address_street: safeCustomerField(customer, "address_street", "addressStreet"),
    address_number: safeCustomerField(customer, "address_number", "addressNumber"),
    address_neighborhood: safeCustomerField(customer, "address_neighborhood", "addressNeighborhood"),
    address_city: safeCustomerField(customer, "address_city", "addressCity"),
    address_postal_code: safeCustomerField(customer, "address_postal_code", "addressPostalCode"),
    notes: normalizedNotes,
    note: normalizedNotes,
    birthDate: safeCustomerField(customer, "birthDate", "birth_date"),
    addressStreet: safeCustomerField(customer, "addressStreet", "address_street"),
    addressNumber: safeCustomerField(customer, "addressNumber", "address_number"),
    addressNeighborhood: safeCustomerField(customer, "addressNeighborhood", "address_neighborhood"),
    addressCity: safeCustomerField(customer, "addressCity", "address_city"),
    addressPostalCode: safeCustomerField(customer, "addressPostalCode", "address_postal_code"),
  };
}

const NOTES_META_OPEN = "<sgvc-meta>";
const NOTES_META_CLOSE = "</sgvc-meta>";
const NEW_CUSTOMER_WINDOW_DAYS = 30;
const BIRTHDAY_WINDOW_DAYS = 14;

function parseNotesMeta(value) {
  const payload = typeof value === "string" ? value : "";
  const start = payload.indexOf(NOTES_META_OPEN);
  if (start === -1) {
    return { text: payload.trim(), metadata: {} };
  }
  const end = payload.indexOf(NOTES_META_CLOSE, start + NOTES_META_OPEN.length);
  if (end === -1) {
    return { text: payload.trim(), metadata: {} };
  }
  const metaPart = payload.slice(start + NOTES_META_OPEN.length, end).trim();
  let metadata = {};
  try {
    metadata = JSON.parse(metaPart);
  } catch (_err) {
    metadata = {};
  }
  const textOnly = payload.slice(0, start).trim();
  return { text: textOnly, metadata };
}

function getCustomerTypeFromNotes(value) {
  const parsed = parseNotesMeta(value || "");
  return String(parsed.metadata.type || "").trim().toUpperCase();
}

function throwCnpjError(message = "CNPJ inválido") {
  const err = new Error(message);
  err.status = 422;
  err.code = "INVALID_CNPJ";
  err.error = true;
  throw err;
}

function ensureCnpjForPJ(type, cnpj) {
  if (type === "PJ" && !cnpj) {
    throwCnpjError();
  }
}

function toValidDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCustomerNew(createdAt, windowDays = NEW_CUSTOMER_WINDOW_DAYS) {
  const date = toValidDate(createdAt);
  if (!date) return false;
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= windowDays;
}

function isBirthdaySoon(value, days = BIRTHDAY_WINDOW_DAYS) {
  const date = toValidDate(value);
  if (!date) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextBirthday = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }
  const diffDays = Math.round((nextBirthday - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

function validateEmailFormat(email) {
  const strictEmailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return strictEmailRegex.test(String(email));
}

function validateNameLength(name) {
  return typeof name === "string" ? name.length <= 255 : true;
}

function validateCnpj(value) {
  if (!value) return true;
  const cnpj = String(value).replace(/\D/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calcDigit = (base, weights) => {
    const sum = base.split("").reduce((acc, digit, idx) => acc + Number(digit) * weights[idx], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const base12 = cnpj.slice(0, 12);
  const digit1 = calcDigit(base12, weights1);
  const digit2 = calcDigit(base12 + digit1, weights2);
  return cnpj === base12 + String(digit1) + String(digit2);
}

function validateCpf(value) {
  if (!value) return true;
  const cpf = String(value).replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  const calcDigit = (base, weights) => {
    const sum = base
      .split("")
      .reduce((acc, digit, idx) => acc + Number(digit) * weights[idx], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const base9 = cpf.slice(0, 9);
  const digit1 = calcDigit(base9, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digit2 = calcDigit(base9 + digit1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cpf === `${base9}${digit1}${digit2}`;
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

function validateBirthDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

async function list(user) {
  const customers = await repo.listCustomers(user ? user.id : null);
  return customers.map((customer) =>
    normalizeCustomerOutput({
      ...customer,
      ownerId: customer.owner_id,
      totalSpent: Number(customer.total_spent || 0),
      purchases: Number(customer.purchases || 0),
      firstPurchase: customer.first_purchase,
      lastPurchase: customer.last_purchase,
      isNew: isCustomerNew(customer.created_at || customer.createdAt),
      isBirthdaySoon: isBirthdaySoon(customer.birth_date || customer.birthDate),
    })
  );
}

async function getById(id, user) {
  const customer = await repo.getCustomerById(id);
  if (!customer) {
    const err = new Error("Cliente n\u00e3o encontrado");
    err.status = 404;
    err.code = "NOT_FOUND";
    throw err;
  }
  if (customer.owner_id && user && customer.owner_id !== user.id) {
    const err = new Error("Acesso negado");
    err.status = 403;
    err.code = "ACCESS_DENIED";
    throw err;
  }
  return normalizeCustomerOutput({
    ...customer,
    ownerId: customer.owner_id,
  });
}

async function create(data, user) {
  const payload = normalizeCustomerInput(data);
  const customerType = getCustomerTypeFromNotes(data.notes || data.note || "");
  ensureCnpjForPJ(customerType, payload.cnpj);

  if (!payload.name || !payload.email) {
    const err = new Error("Campos obrigat\u00f3rios ausentes");
    err.status = 422;
    err.code = "REQUIRED_FIELDS";
    throw err;
  }

  if (!validateNameLength(payload.name)) {
    const err = new Error("Nome excede o tamanho permitido");
    err.status = 422;
    err.code = "NAME_TOO_LONG";
    throw err;
  }

  if (hasSqlInjectionRisk(payload.name) || hasXssRisk(payload.name)) {
    const err = new Error("Nome inv\u00e1lido");
    err.status = 422;
    err.code = "INVALID_NAME";
    throw err;
  }

  if (!validateEmailFormat(payload.email)) {
    const err = new Error("Formato de e-mail inv\u00e1lido");
    err.status = 422;
    err.code = "INVALID_EMAIL";
    throw err;
  }

  if (hasSqlInjectionRisk(payload.phone) || hasXssRisk(payload.phone)) {
    const err = new Error("Telefone inv\u00e1lido");
    err.status = 422;
    err.code = "INVALID_PHONE";
    throw err;
  }

  if (!validateCnpj(payload.cnpj)) {
    throwCnpjError();
  }

  if (payload.cpf && !validateCpf(payload.cpf)) {
    const err = new Error("CPF inv\u00e1lido");
    err.status = 422;
    err.code = "INVALID_CPF";
    throw err;
  }

  if (!validateBirthDate(payload.birthDate)) {
    const err = new Error("Data de nascimento invalida");
    err.status = 422;
    err.code = "INVALID_BIRTH_DATE";
    throw err;
  }

  const addressFields = [
    payload.addressStreet,
    payload.addressNumber,
    payload.addressNeighborhood,
    payload.addressCity,
    payload.addressPostalCode,
    payload.notes,
  ];
  if (addressFields.some((value) => hasSqlInjectionRisk(value) || hasXssRisk(value))) {
    const err = new Error("Endere\u00e7o inv\u00e1lido");
    err.status = 422;
    err.code = "INVALID_ADDRESS";
    throw err;
  }

  const exists = await repo.customerEmailExists(payload.email);
  if (exists) {
    const err = new Error("E-mail ja cadastrado");
    err.status = 409;
    err.code = "EMAIL_ALREADY_EXISTS";
    throw err;
  }

  if (payload.cpf) {
    const cpfExists = await repo.customerCpfExists(payload.cpf);
    if (cpfExists) {
      const err = new Error("CPF ja cadastrado");
      err.status = 422;
      err.code = "CPF_ALREADY_EXISTS";
      throw err;
    }
  }

  if (payload.cnpj) {
    const cnpjExists = await repo.customerCnpjExists(payload.cnpj);
    if (cnpjExists) {
      const err = new Error("CNPJ ja cadastrado");
      err.status = 422;
      err.code = "CNPJ_ALREADY_EXISTS";
      throw err;
    }
  }

  const created = await repo.createCustomer({
    ...payload,
    ownerId: user ? user.id : null,
  });
  return normalizeCustomerOutput({
    ...created,
    ownerId: created.owner_id,
  });
}

async function update(id, data, user) {
  const current = await repo.getCustomerById(id);
  if (!current) {
    const err = new Error("Cliente n\u00e3o encontrado");
    err.status = 404;
    err.code = "NOT_FOUND";
    throw err;
  }
  if (current.owner_id && user && current.owner_id !== user.id) {
    const err = new Error("Acesso negado");
    err.status = 403;
    err.code = "ACCESS_DENIED";
    throw err;
  }

  const payload = normalizeCustomerInput(data);
  const customerType = getCustomerTypeFromNotes(data.notes || data.note || "");
  ensureCnpjForPJ(customerType, payload.cnpj);

  if (payload.name && !validateNameLength(payload.name)) {
    const err = new Error("Nome excede o tamanho permitido");
    err.status = 422;
    err.code = "NAME_TOO_LONG";
    throw err;
  }

  if (payload.name && (hasSqlInjectionRisk(payload.name) || hasXssRisk(payload.name))) {
    const err = new Error("Nome inv\u00e1lido");
    err.status = 422;
    err.code = "INVALID_NAME";
    throw err;
  }

  if (payload.phone && (hasSqlInjectionRisk(payload.phone) || hasXssRisk(payload.phone))) {
    const err = new Error("Telefone inv\u00e1lido");
    err.status = 422;
    err.code = "INVALID_PHONE";
    throw err;
  }

  if (payload.cpf && !validateCpf(payload.cpf)) {
    const err = new Error("CPF inv\u00e1lido");
    err.status = 422;
    err.code = "INVALID_CPF";
    throw err;
  }

  if (payload.cnpj && !validateCnpj(payload.cnpj)) {
    throwCnpjError();
  }

  if (payload.birthDate && !validateBirthDate(payload.birthDate)) {
    const err = new Error("Data de nascimento invalida");
    err.status = 422;
    err.code = "INVALID_BIRTH_DATE";
    throw err;
  }

  const addressFields = [
    payload.addressStreet,
    payload.addressNumber,
    payload.addressNeighborhood,
    payload.addressCity,
    payload.addressPostalCode,
    payload.notes,
  ];
  if (addressFields.some((value) => hasSqlInjectionRisk(value) || hasXssRisk(value))) {
    const err = new Error("Endere\u00e7o inv\u00e1lido");
    err.status = 422;
    err.code = "INVALID_ADDRESS";
    throw err;
  }

  if (payload.email) {
    if (!validateEmailFormat(payload.email)) {
      const err = new Error("Formato de e-mail inv\u00e1lido");
      err.status = 422;
      err.code = "INVALID_EMAIL";
      throw err;
    }
    const exists = await repo.customerEmailExists(payload.email, id);
    if (exists) {
      const err = new Error("E-mail ja cadastrado");
      err.status = 409;
      err.code = "EMAIL_ALREADY_EXISTS";
      throw err;
    }
  }

  if (payload.cpf) {
    const exists = await repo.customerCpfExists(payload.cpf, id);
    if (exists) {
      const err = new Error("CPF ja cadastrado");
      err.status = 422;
      err.code = "CPF_ALREADY_EXISTS";
      throw err;
    }
  }

  if (payload.cnpj) {
    const exists = await repo.customerCnpjExists(payload.cnpj, id);
    if (exists) {
      const err = new Error("CNPJ ja cadastrado");
      err.status = 422;
      err.code = "CNPJ_ALREADY_EXISTS";
      throw err;
    }
  }

  const updated = await repo.updateCustomer(id, payload);
  return normalizeCustomerOutput({
    ...updated,
    ownerId: updated.owner_id,
  });
}

async function remove(id, user) {
  const current = await repo.getCustomerById(id);
  if (!current) {
    const err = new Error("Cliente n\u00e3o encontrado");
    err.status = 404;
    err.code = "NOT_FOUND";
    throw err;
  }
  if (current.owner_id && user && current.owner_id !== user.id) {
    const err = new Error("Acesso negado");
    err.status = 403;
    err.code = "ACCESS_DENIED";
    throw err;
  }
  const removed = await repo.deleteCustomer(id);
  return normalizeCustomerOutput({
    ...removed,
    ownerId: removed.owner_id,
  });
}

module.exports = { list, getById, create, update, remove };
