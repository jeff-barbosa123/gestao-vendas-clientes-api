// Dia comercial da venda. O fuso padrao da empresa e America/Fortaleza (ainda nao ha fuso por empresa).
// sales.date guarda dois tipos de valor:
//  - venda com data informada: meia-noite UTC exata ("so data"), o dia gravado e mantido;
//  - PDV e encomenda entregue: horario real, que vira o dia no fuso da empresa.
const BUSINESS_TIME_ZONE = "America/Fortaleza";
const DAY_MS = 24 * 60 * 60 * 1000;

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "YYYY-MM-DD" do dia da venda, ou null se a data for invalida.
function saleDay(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return null;
  if (ms % DAY_MS === 0) return date.toISOString().slice(0, 10);
  const parts = {};
  for (const p of dayFormatter.formatToParts(date)) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// O mesmo dia como Date a meia-noite UTC: compara com os filtros e serve as chaves de dia/semana/mes/ano.
function saleDayDate(value) {
  const day = saleDay(value);
  return new Date(day === null ? NaN : `${day}T00:00:00.000Z`);
}

// Expressao SQL equivalente a saleDay (nao depende do fuso da sessao). "column" e nome fixo do codigo, nunca entrada do usuario.
function saleDaySql(column) {
  return `(CASE WHEN (${column} AT TIME ZONE 'UTC')::time = TIME '00:00' THEN (${column} AT TIME ZONE 'UTC')::date ELSE (${column} AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date END)`;
}

// Limites do filtro por dia da venda. A primeira condicao de cada lado e uma faixa folgada sobre a coluna,
// para o PostgreSQL continuar usando o indice; a segunda aplica o dia exato. "param" e um placeholder ($2, $3).
function saleFromSql(column, param) {
  return `(${column} >= (${param}::date)::timestamp AT TIME ZONE 'UTC' AND ${saleDaySql(column)} >= ${param}::date)`;
}

function saleToSql(column, param) {
  return `(${column} < (${param}::date + 2)::timestamp AT TIME ZONE 'UTC' AND ${saleDaySql(column)} <= ${param}::date)`;
}

module.exports = { BUSINESS_TIME_ZONE, saleDay, saleDayDate, saleDaySql, saleFromSql, saleToSql };
