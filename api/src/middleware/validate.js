/**
 * Validação genérica de entrada (sem dependências).
 *
 * O que fica aqui: validação de FORMA (tipo, tamanho, estrutura) antes de chegar nos serviços.
 * Regras de negócio e mensagens específicas continuam nos serviços (ex.: "items é obrigatório").
 *
 * Uso por rota:
 *   const { validate, v } = require("../middleware/validate");
 *   router.post("/", validate({ body: { name: v.string({ max: 200 }) } }), controller.create);
 *
 * Regras (`v`): string({max}), number({min,max}), array({max,of}), object(shape).
 * Campos ausentes/null são ignorados (obrigatoriedade é regra dos serviços).
 * Campos fora do esquema não são alterados nem removidos.
 *
 * Guardas globais (montados em routes/index.js):
 *   requireObjectBody  - POST/PUT/PATCH com corpo JSON que não seja objeto (ex.: array) -> 400
 *   rejectNestedQuery  - query com array/objeto (?a[b]=1, ?a=1&a=2) -> 400
 *
 * Erros: status 400, sem `code` explícito, para o errorHandler preservar a mensagem.
 */

const isPlainObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

const v = {
  string: (opts = {}) => ({ type: "string", ...opts }),
  number: (opts = {}) => ({ type: "number", ...opts }),
  array: (opts = {}) => ({ type: "array", ...opts }),
  object: (shape = {}, opts = {}) => ({ type: "object", shape, ...opts }),
};

function checkValue(value, rule, path) {
  if (value === undefined || value === null) return null;

  switch (rule.type) {
    case "string":
      if (typeof value !== "string") return `${path} deve ser texto`;
      if (rule.max != null && value.length > rule.max) {
        return `${path} deve ter no máximo ${rule.max} caracteres`;
      }
      return null;

    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return `${path} deve ser um número`;
      if (rule.min != null && value < rule.min) return `${path} deve ser maior ou igual a ${rule.min}`;
      if (rule.max != null && value > rule.max) return `${path} deve ser menor ou igual a ${rule.max}`;
      return null;

    case "array": {
      if (!Array.isArray(value)) return `${path} deve ser uma lista`;
      if (rule.max != null && value.length > rule.max) {
        return `${path} deve ter no máximo ${rule.max} itens`;
      }
      if (rule.of) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (item === null || item === undefined) return `${path}[${i}] é inválido`;
          const msg = checkValue(item, rule.of, `${path}[${i}]`);
          if (msg) return msg;
        }
      }
      return null;
    }

    case "object":
      if (!isPlainObject(value)) return `${path} deve ser um objeto`;
      return checkShape(value, rule.shape || {}, path);

    default:
      return null;
  }
}

function checkShape(obj, shape, prefix) {
  for (const [key, rule] of Object.entries(shape)) {
    const msg = checkValue(obj[key], rule, prefix ? `${prefix}.${key}` : key);
    if (msg) return msg;
  }
  return null;
}

function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    if (body) {
      if (!isPlainObject(req.body)) return next(badRequest("O corpo da requisição deve ser um objeto JSON"));
      const msg = checkShape(req.body, body, "");
      if (msg) return next(badRequest(msg));
    }
    if (query) {
      const msg = checkShape(req.query || {}, query, "");
      if (msg) return next(badRequest(msg));
    }
    if (params) {
      const msg = checkShape(req.params || {}, params, "");
      if (msg) return next(badRequest(msg));
    }
    return next();
  };
}

function requireObjectBody(req, _res, next) {
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.body !== undefined && !isPlainObject(req.body)) {
    return next(badRequest("O corpo da requisição deve ser um objeto JSON"));
  }
  return next();
}

function rejectNestedQuery(req, _res, next) {
  for (const [key, value] of Object.entries(req.query || {})) {
    if (value !== null && typeof value === "object") {
      return next(badRequest(`Parâmetro de consulta inválido: ${String(key).slice(0, 50)}`));
    }
  }
  return next();
}

module.exports = { validate, v, requireObjectBody, rejectNestedQuery, isPlainObject };
