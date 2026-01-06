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
    const dx = new Date(s.date);
    return dx >= startDate && dx <= endDate;
  });
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
    lastSaleAt: sales.length ? sales[sales.length - 1].date : null,
  };
}

async function buildTimeseries(breakdown = "day", filters = {}) {
  const normalizedBreakdown = validateBreakdown(breakdown);
  const { startDate, endDate } = resolveTemporalRange(filters);

  const salesAll = await repo.listSales();
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
};
