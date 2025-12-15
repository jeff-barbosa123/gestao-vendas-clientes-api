const { revenueBetween, db } = require('../models/db');
const {
  resolveTemporalRange,
  validateBreakdown,
  toIsoDay,
  toWeekKeyUTC,
  toMonthKeyUTC,
} = require('../utils/dateValidation');

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

function getOverview() {
  const sales = revenueBetween();
  const aggregates = buildFinancialAggregates(sales);

  return {
    ...aggregates,
    customers: db.customers.length,
    products: db.products.length,
    lastSaleAt: sales.length ? sales[sales.length - 1].date : null,
  };
}

function buildTimeseries(breakdown = 'day', filters = {}) {
  const normalizedBreakdown = validateBreakdown(breakdown);
  const { startDate, endDate } = resolveTemporalRange(filters);

  const sales = revenueBetween(startDate, endDate);
  const buckets = {};

  sales.forEach((sale) => {
    const d = new Date(sale.date);
    let key = '';
    if (normalizedBreakdown === 'day') {
      key = toIsoDay(d);
    } else if (normalizedBreakdown === 'week') {
      key = toWeekKeyUTC(d);
    } else if (normalizedBreakdown === 'month') {
      key = toMonthKeyUTC(d);
    } else if (normalizedBreakdown === 'year') {
      key = String(d.getUTCFullYear());
    }
    buckets[key] = buckets[key] || [];
    buckets[key].push(sale);
  });

  if (normalizedBreakdown === 'total') {
    return [
      {
        period: 'total',
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
