const { withTransaction } = require("../index");

// Executa dentro da transação do chamador (client) ou abre uma própria.
// Permite que venda + estoque compartilhem a mesma transação (tudo ou nada).
function runInTx(client, handler) {
  return client ? handler(client) : withTransaction(handler);
}

// IDs são UUID no Postgres. Um id em formato inválido (ex.: "abc", "999") gerava
// erro 22P02 no banco e a API respondia 500; agora é tratado como "não encontrado".
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function toNumber(value) {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

module.exports = {
  runInTx,
  UUID_RE,
  isUuid,
  toNumber,
};
