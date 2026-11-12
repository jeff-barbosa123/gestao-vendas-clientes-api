const repo = require("../db/repository");
const {
  resolveTemporalRange,
  validateBreakdown,
  toIsoDay,
  toWeekKeyUTC,
  toMonthKeyUTC,
} = require("../utils/dateValidation");

function buildFinancialAggregates(sales) {
  const salesCount = sales.length;
  const revenueTotal = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const cmvTotal = sales.reduce((sum, s) => sum + (s.cmv || 0), 0);
  const profitTotal = revenueTotal - cmvTotal;
  const avgTicket = salesCount > 0 ? revenueTotal / salesCount : 0;
  const margin = revenueTotal > 0 ? profitTotal / revenueTotal : 0;

  return {
    revenueTotal: Number(revenueTotal.toFixed(2)),
    cmvTotal: Number(cmvTotal.toFixed(2)),
    profitTotal: Number(profitTotal.toFixed(2)),
    margin,
    avgTicket: Number(avgTicket.toFixed(2)),
    salesCount,
  };
}

function filterByOwner(list, user) {
  if (!user || !user.id) return list;
  return list.filter((item) => !item.owner_id || item.owner_id === user.id);
}

function filterSalesByDate(sales, startDate, endDate) {
  return sales.filter((s) => {
    // Venda cancelada não entra em faturamento/dashboard
    if (s.status === "CANCELED" || s.status_venda === "cancelada") return false;
    const dx = new Date(s.date);
    return (!startDate || dx >= startDate) && (!endDate || dx <= endDate);
  });
}

// Abaixo desta margem bruta o produto entra no alerta de precificação
const LOW_MARGIN_THRESHOLD = Number(process.env.LOW_MARGIN_THRESHOLD || 0.3);

function buildPricingAlerts(products) {
  const alerts = [];
  for (const p of products) {
    const price = Number(p.price);
    const cost = Number(p.purchase_price);
    if (!Number.isFinite(price) || !Number.isFinite(cost) || cost <= 0) continue;
    const margin = price > 0 ? (price - cost) / price : -1;
    let level = null;
    if (price < cost) level = "below_cost";
    else if (margin < LOW_MARGIN_THRESHOLD) level = "low_margin";
    if (!level) continue;
    alerts.push({
      productId: p.id,
      name: p.name,
      price: Number(price.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      margin: Number(margin.toFixed(4)),
      level,
      message:
        level === "below_cost"
          ? `Vendido abaixo do custo (R$ ${price.toFixed(2)} contra custo de R$ ${cost.toFixed(2)})`
          : `Margem de ${(margin * 100).toFixed(0)}%, abaixo do mínimo de ${(LOW_MARGIN_THRESHOLD * 100).toFixed(0)}%`,
    });
  }
  // Abaixo do custo primeiro, depois menor margem
  return alerts.sort((a, b) => (a.level === b.level ? a.margin - b.margin : a.level === "below_cost" ? -1 : 1));
}

async function getOverview(filters = {}, user) {
  const { startDate, endDate } = resolveTemporalRange(filters);
  const salesAll = await repo.listSales(user ? user.id : null);
  const sales = filterSalesByDate(salesAll, startDate, endDate);
  const aggregates = buildFinancialAggregates(sales);
  const customers = filterByOwner(await repo.listCustomers(user ? user.id : null), user);
  const products = filterByOwner(await repo.listProducts(user ? user.id : null), user);
  const recipes = filterByOwner(await repo.listRecipes(user ? user.id : null, false), user).filter(
    (r) => r.status !== "INACTIVE"
  );

  return {
    ...aggregates,
    customers: customers.length,
    products: products.length,
    recipes: recipes.length,
    linkedProducts: products.filter((p) => p.ficha_tecnica_id).length,
    pricingAlerts: buildPricingAlerts(products),
    stockAlerts: (await repo.listLowStockIngredients(user ? user.id : null)).map((i) => ({
      ingredientId: i.id,
      name: i.name,
      stockQuantity: i.stockQuantity,
      minStock: i.minStock,
      stockUnit: i.stockUnit,
    })),
    lowMarginThreshold: LOW_MARGIN_THRESHOLD,
    // listSales ordena por data DESC: a venda mais recente é a primeira (antes pegava a mais antiga)
    lastSaleAt: sales.length ? sales[0].date : null,
  };
}

async function buildTimeseries(breakdown = "day", filters = {}, user) {
  const normalizedBreakdown = validateBreakdown(breakdown);
  const { startDate, endDate } = resolveTemporalRange(filters);

  // Somente vendas do usuário autenticado (antes listava vendas de todos os usuários)
  const salesAll = await repo.listSales(user ? user.id : null);
  const sales = filterSalesByDate(salesAll, startDate, endDate);
  const buckets = {};

  sales.forEach((sale) => {
    const d = new Date(sale.date);
    let key = "";
    if (normalizedBreakdown === "day") {
      key = toIsoDay(d);
    } else if (normalizedBreakdown === "week") {
      key = toWeekKeyUTC(d);
    } else if (normalizedBreakdown === "month") {
      key = toMonthKeyUTC(d);
    } else if (normalizedBreakdown === "year") {
      key = String(d.getUTCFullYear());
    }
    buckets[key] = buckets[key] || [];
    buckets[key].push(sale);
  });

  if (normalizedBreakdown === "total") {
    return [
      {
        period: "total",
        ...buildFinancialAggregates(sales),
      },
    ];
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, entries]) => ({
      period,
      ...buildFinancialAggregates(entries),
    }));
}

module.exports = {
  getOverview,
  buildTimeseries,
  buildPricingAlerts,
};
