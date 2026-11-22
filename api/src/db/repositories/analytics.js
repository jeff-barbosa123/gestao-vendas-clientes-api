const { query } = require("../index");

// Agregacoes do dashboard feitas no PostgreSQL: o banco devolve so as linhas ja somadas
// (uma por periodo) em vez de todas as vendas e itens carregados em memoria.
// Venda cancelada nao entra em faturamento/dashboard (mesma regra do filtro em JS anterior).
const NOT_CANCELED = "s.status <> 'CANCELED' AND s.status_venda <> 'cancelada'";

// Chaves de periodo em UTC, no mesmo formato de toIsoDay/toWeekKeyUTC/toMonthKeyUTC (semana ISO 8601).
const PERIOD_KEYS = {
  day: "to_char(s.date AT TIME ZONE 'UTC', 'YYYY-MM-DD')",
  week: "to_char(s.date AT TIME ZONE 'UTC', 'IYYY-\"W\"IW')",
  month: "to_char(s.date AT TIME ZONE 'UTC', 'YYYY-MM')",
  year: "to_char(s.date AT TIME ZONE 'UTC', 'YYYY')",
};

function buildWhere(ownerId, startDate, endDate) {
  const params = [ownerId || null, startDate || null, endDate || null];
  const where = `($1::uuid IS NULL OR s.owner_id = $1) AND ($2::timestamptz IS NULL OR s.date >= $2) AND ($3::timestamptz IS NULL OR s.date <= $3) AND ${NOT_CANCELED}`;
  return { where, params };
}

// breakdown: day | week | month | year | total. Devolve [{ period, salesCount, revenue, cmv }] ordenado por periodo.
async function salesTotalsByPeriod(ownerId, startDate, endDate, breakdown) {
  const { where, params } = buildWhere(ownerId, startDate, endDate);
  const periodExpr = PERIOD_KEYS[breakdown];
  const sql = periodExpr
    ? `SELECT ${periodExpr} AS period, COUNT(*)::int AS sales_count, COALESCE(SUM(s.total), 0) AS revenue, COALESCE(SUM(s.cmv), 0) AS cmv
         FROM sales s WHERE ${where} GROUP BY 1 ORDER BY 1 ASC`
    : `SELECT 'total' AS period, COUNT(*)::int AS sales_count, COALESCE(SUM(s.total), 0) AS revenue, COALESCE(SUM(s.cmv), 0) AS cmv
         FROM sales s WHERE ${where}`;
  const result = await query(sql, params);
  return result.rows.map((r) => ({
    period: r.period,
    salesCount: r.sales_count,
    revenue: Number(r.revenue),
    cmv: Number(r.cmv),
  }));
}

// Data da venda mais recente dentro do filtro (ou null).
async function lastSaleDate(ownerId, startDate, endDate) {
  const { where, params } = buildWhere(ownerId, startDate, endDate);
  const result = await query(`SELECT MAX(s.date) AS last_sale_at FROM sales s WHERE ${where}`, params);
  return result.rows[0] ? result.rows[0].last_sale_at : null;
}

// Contagens do painel numa unica ida ao banco.
async function overviewCounts(ownerId) {
  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM customers WHERE ($1::uuid IS NULL OR owner_id = $1)) AS customers,
       (SELECT COUNT(*) FROM products WHERE ($1::uuid IS NULL OR owner_id = $1)) AS products,
       (SELECT COUNT(*) FROM products WHERE ($1::uuid IS NULL OR owner_id = $1) AND ficha_tecnica_id IS NOT NULL) AS linked_products,
       (SELECT COUNT(*) FROM recipes WHERE ($1::uuid IS NULL OR owner_id = $1) AND status <> 'INACTIVE') AS recipes`,
    [ownerId || null]
  );
  const row = result.rows[0];
  return {
    customers: Number(row.customers),
    products: Number(row.products),
    linkedProducts: Number(row.linked_products),
    recipes: Number(row.recipes),
  };
}

// Produtos so com os campos usados no alerta de precificacao (evita carregar a linha inteira).
async function productsForPricingAlerts(ownerId) {
  const result = await query(
    `SELECT id, name, price, purchase_price, margin_ref FROM products WHERE ($1::uuid IS NULL OR owner_id = $1) AND purchase_price > 0`,
    [ownerId || null]
  );
  return result.rows;
}

module.exports = { salesTotalsByPeriod, lastSaleDate, overviewCounts, productsForPricingAlerts };
