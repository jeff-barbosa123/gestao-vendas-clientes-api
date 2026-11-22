const repo = require('../db/repositories/customFields');

const ENTITIES = ['product', 'customer'];
const TYPES = ['text', 'number', 'date', 'boolean', 'select'];
const MAX_FIELDS = 15;
const MAX_OPTIONS = 20;

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function assertEntity(entity) {
  if (!ENTITIES.includes(entity)) throw httpError(404, 'ENTITY_NOT_FOUND', 'Tipo inválido. Use product ou customer.');
}

const hasMarkup = (s) => /[<>]/.test(s);

function slug(label) {
  return String(label)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function cleanDefinition(raw) {
  const label = String((raw && raw.label) || '').trim();
  if (!label || label.length > 40) throw httpError(422, 'INVALID_FIELD', 'O rótulo do campo deve ter de 1 a 40 caracteres.');
  if (hasMarkup(label)) throw httpError(422, 'INVALID_FIELD', 'O rótulo não pode conter < ou >.');
  const type = String(raw.type || 'text');
  if (!TYPES.includes(type)) throw httpError(422, 'INVALID_FIELD', `Tipo de campo inválido: ${type}.`);
  const key = raw.key ? String(raw.key) : slug(label);
  if (!/^[a-z0-9_]{1,40}$/.test(key)) throw httpError(422, 'INVALID_FIELD', 'Não foi possível gerar um identificador para o campo.');
  let options = [];
  if (type === 'select') {
    options = (Array.isArray(raw.options) ? raw.options : []).map((o) => String(o).trim()).filter(Boolean);
    options = [...new Set(options)];
    if (options.length < 2) throw httpError(422, 'INVALID_FIELD', `O campo "${label}" precisa de ao menos 2 opções.`);
    if (options.length > MAX_OPTIONS || options.some((o) => o.length > 40 || hasMarkup(o))) {
      throw httpError(422, 'INVALID_FIELD', `Opções inválidas no campo "${label}".`);
    }
  }
  return { key, label, type, options, required: !!raw.required };
}

async function listDefinitions(ownerId, entity) {
  assertEntity(entity);
  return repo.list(ownerId, entity);
}

async function saveDefinitions(ownerId, entity, input) {
  assertEntity(entity);
  const list = Array.isArray(input && input.fields) ? input.fields : null;
  if (!list) throw httpError(422, 'INVALID_FIELD', 'Envie { fields: [...] }.');
  if (list.length > MAX_FIELDS) throw httpError(422, 'INVALID_FIELD', `No máximo ${MAX_FIELDS} campos extras.`);
  const seen = new Set();
  const cleaned = list.map(cleanDefinition);
  // Rótulos que geram a mesma chave são rejeitados.
  cleaned.forEach((f) => {
    if (seen.has(f.key)) throw httpError(422, 'INVALID_FIELD', `Há campos repetidos: "${f.label}".`);
    seen.add(f.key);
  });
  return repo.replace(ownerId, entity, cleaned);
}

function coerce(def, value) {
  switch (def.type) {
    case 'text': {
      const s = String(value).trim();
      if (s.length > 200 || hasMarkup(s)) throw httpError(422, 'INVALID_VALUE', `Valor inválido em "${def.label}".`);
      return s;
    }
    case 'number': {
      const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
      if (!Number.isFinite(n)) throw httpError(422, 'INVALID_VALUE', `"${def.label}" deve ser um número.`);
      return n;
    }
    case 'date': {
      const s = String(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) {
        throw httpError(422, 'INVALID_VALUE', `"${def.label}" deve ser uma data (AAAA-MM-DD).`);
      }
      return s;
    }
    case 'boolean':
      if (typeof value !== 'boolean') throw httpError(422, 'INVALID_VALUE', `"${def.label}" deve ser verdadeiro ou falso.`);
      return value;
    case 'select':
      if (!def.options.includes(String(value))) throw httpError(422, 'INVALID_VALUE', `Opção inválida em "${def.label}".`);
      return String(value);
    default:
      throw httpError(422, 'INVALID_VALUE', 'Tipo não suportado.');
  }
}

const isEmpty = (v) => v === null || v === undefined || v === '';

async function saveValues(ownerId, entity, id, input) {
  assertEntity(entity);
  const values = input && typeof input.values === 'object' && input.values ? input.values : null;
  if (!values) throw httpError(422, 'INVALID_VALUE', 'Envie { values: {...} }.');
  const defs = await repo.list(ownerId, entity);
  const byKey = new Map(defs.map((d) => [d.key, d]));
  const patch = {};
  const remove = [];
  for (const [key, value] of Object.entries(values)) {
    const def = byKey.get(key);
    if (!def) throw httpError(422, 'INVALID_VALUE', `Campo extra desconhecido: ${key}.`);
    if (isEmpty(value) || (def.type === 'boolean' && value === false && !def.required)) {
      if (def.required && isEmpty(value)) throw httpError(422, 'INVALID_VALUE', `"${def.label}" é obrigatório.`);
      remove.push(key);
    } else {
      patch[key] = coerce(def, value);
    }
  }
  const extra = await repo.applyValues(ownerId, entity, id, patch, remove);
  if (extra === null) throw httpError(404, 'NOT_FOUND', 'Registro não encontrado.');
  return { extra };
}

module.exports = { listDefinitions, saveDefinitions, saveValues, slug };
