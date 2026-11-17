const repo = require("../db/repository");
const analyticsRepo = require("../db/repositories/analytics");
const {
  resolveTemporalRange,
  validateBreakdown,
} = require("../utils/dateValidation");

// Recebe os totais ja agregados no banco: { salesCount, revenue, cmv }
function buildFinancialAggregates({ salesCount = 0, revenue = 0, cmv = 0 } = {}) {
  const profitTotal = revenue - cmv;
  const avgTicket = salesCount > 0 ? revenue / salesCount : 0;
  const margin = revenue > 0 ? profitTotal / revenue : 0;

  return {
    revenueTotal: Number(revenue.toFixed(2)),
    cmvTotal: Number(cmv.toFixed(2)),
    profitTotal: Number(profitTotal.toFixed(2)),
    margin,
    avgTicket: Number(avgTicket.toFixed(2)),
    salesCount,
  };
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
  const ownerId = user ? user.id : null;
  // Agregacao no PostgreSQL: soma/contagem das vendas no periodo e contagens do painel, sem carregar vendas em memoria
  const [[totals], lastSaleAt, counts, pricingProducts, lowStock] = await Promise.all([
    analyticsRepo.salesTotalsByPeriod(ownerId, startDate, endDate, "total"),
    analyticsRepo.lastSaleDate(ownerId, startDate, endDate),
    analyticsRepo.overviewCounts(ownerId),
    analyticsRepo.productsForPricingAlerts(ownerId),
    repo.listLowStockIngredients(ownerId),
  ]);

  return {
    ...buildFinancialAggregates(totals),
    customers: counts.customers,
    products: counts.products,
    recipes: counts.recipes,
    linkedProducts: counts.linkedProducts,
    pricingAlerts: buildPricingAlerts(pricingProducts),
    stockAlerts: lowStock.map((i) => ({
      ingredientId: i.id,
      name: i.name,
      stockQuantity: i.stockQuantity,
      minStock: i.minStock,
      stockUnit: i.stockUnit,
    })),
    lowMarginThreshold: LOW_MARGIN_THRESHOLD,
    // venda mais recente dentro do filtro (MAX(date) no banco)
    lastSaleAt,
  };
}

async function buildTimeseries(breakdown = "day", filters = {}, user) {
  const normalizedBreakdown = validateBreakdown(breakdown);
  const { startDate, endDate } = resolveTemporalRange(filters);

  // Somente vendas do usuario autenticado; o agrupamento por periodo (UTC) e feito no banco
  const rows = await analyticsRepo.salesTotalsByPeriod(user ? user.id : null, startDate, endDate, normalizedBreakdown);
  return rows.map((row) => ({ period: row.period, ...buildFinancialAggregates(row) }));
}

module.exports = {
  getOverview,
  buildTimeseries,
  buildPricingAlerts,
};
