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

// Queda da margem (em pontos) em relacao a margem de referencia que dispara o alerta.
const MARGIN_DROP_TOLERANCE = Number(process.env.MARGIN_DROP_TOLERANCE || 0.05);

// Preco que devolve a margem alvo para o custo atual (arredondado para cima, em centavos).
function suggestPrice(cost, targetMargin) {
  const target = Math.min(Math.max(targetMargin, 0), 0.95);
  return Math.ceil((cost / (1 - target)) * 100 - 1e-9) / 100;
}

function buildPricingAlerts(products) {
  const alerts = [];
  for (const p of products) {
    const price = Number(p.price);
    const cost = Number(p.purchase_price);
    if (!Number.isFinite(price) || !Number.isFinite(cost) || cost <= 0) continue;
    const margin = price > 0 ? (price - cost) / price : -1;
    const ref = p.margin_ref == null ? null : Number(p.margin_ref);
    const drop = ref != null && Number.isFinite(ref) ? ref - margin : 0;
    let level = null;
    if (price < cost) level = "below_cost";
    else if (margin < LOW_MARGIN_THRESHOLD) level = "low_margin";
    else if (drop >= MARGIN_DROP_TOLERANCE) level = "margin_drop";
    if (!level) continue;
    const target = Math.max(ref != null && Number.isFinite(ref) ? ref : 0, LOW_MARGIN_THRESHOLD);
    const pct = (v) => (v * 100).toFixed(0);
    let message;
    if (level === "below_cost") message = `Vendido abaixo do custo (R$ ${price.toFixed(2)} contra custo de R$ ${cost.toFixed(2)})`;
    else if (level === "low_margin") message = `Margem de ${pct(margin)}%, abaixo do mínimo de ${pct(LOW_MARGIN_THRESHOLD)}%`;
    else message = `Margem caiu de ${pct(ref)}% para ${pct(margin)}% (o custo subiu)`;
    alerts.push({
      productId: p.id,
      name: p.name,
      price: Number(price.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      margin: Number(margin.toFixed(4)),
      referenceMargin: ref != null && Number.isFinite(ref) ? ref : null,
      suggestedPrice: suggestPrice(cost, target),
      level,
      message,
    });
  }
  // Abaixo do custo primeiro, depois maior queda/menor margem
  const rank = { below_cost: 0, margin_drop: 1, low_margin: 2 };
  return alerts.sort((a, b) => (a.level === b.level ? a.margin - b.margin : rank[a.level] - rank[b.level]));
}

async function getOverview(filters = {}, user) {
  const { startDate, endDate } = resolveTemporalRange(filters);
  const ownerId = user ? user.id : null;
  // Agregacao no PostgreSQL: soma/contagem das vendas no periodo e contagens do painel, sem carregar vendas em memoria
  const [[totals], lastSaleAt, counts, pricingProducts, lowStock, lowStockProducts] = await Promise.all([
    analyticsRepo.salesTotalsByPeriod(ownerId, startDate, endDate, "total"),
    analyticsRepo.lastSaleDate(ownerId, startDate, endDate),
    analyticsRepo.overviewCounts(ownerId),
    analyticsRepo.productsForPricingAlerts(ownerId),
    repo.listLowStockIngredients(ownerId),
    repo.listLowStockProducts(ownerId),
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
    productStockAlerts: lowStockProducts,
    lowMarginThreshold: LOW_MARGIN_THRESHOLD,
    marginDropTolerance: MARGIN_DROP_TOLERANCE,
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
