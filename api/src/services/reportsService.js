const PDFDocument = require('pdfkit');
const { revenueBetween } = require('../models/db');
const {
  resolveTemporalRange,
  validateBreakdown,
  toIsoDay,
  toWeekKeyUTC,
  toMonthKeyUTC,
  buildError,
} = require('../utils/dateValidation');

function summarize(sales, granularity = 'total') {
  if (granularity === 'total') {
    const total = sales.reduce((s, v) => s + (v.total || 0), 0);
    const totalRounded = Number(total.toFixed(2));
    return { total: totalRounded, totalFaturamento: totalRounded, quantidadeVendas: sales.length };
  }
  const buckets = {};
  for (const s of sales) {
    const d = new Date(s.date);
    let key = '';
    if (granularity === 'day') {
      key = toIsoDay(d);
    } else if (granularity === 'week') {
      key = toWeekKeyUTC(d);
    } else if (granularity === 'month') {
      key = toMonthKeyUTC(d);
    } else if (granularity === 'year') {
      key = String(d.getUTCFullYear());
    }
    buckets[key] = buckets[key] || { total: 0, count: 0 };
    buckets[key].total += s.total || 0;
    buckets[key].count += 1;
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      total: Number(data.total.toFixed(2)),
      quantidadeVendas: data.count,
    }));
}

function resolveUserId(requestedUserId, user) {
  if (!user || !user.id) {
    const err = buildError('Token invalido ou ausente', 401);
    throw err;
  }
  if (requestedUserId && requestedUserId !== user.id) {
    const err = buildError('Acesso negado', 403);
    throw err;
  }
  return user.id;
}

function getRevenue({ start, end, day, week, month, year, breakdown, userId, user }) {
  const normalizedBreakdown = validateBreakdown(breakdown || 'total');
  const { startDate, endDate } = resolveTemporalRange({ start, end, day, week, month, year });
  const ownerId = resolveUserId(userId, user);
  const sales = revenueBetween(startDate, endDate, ownerId);
  if (normalizedBreakdown === 'total') return summarize(sales, 'total');
  if (!['day', 'week', 'month', 'year'].includes(normalizedBreakdown)) {
    const err = new Error('Parametro breakdown invalido');
    err.status = 400;
    throw err;
  }
  return summarize(sales, normalizedBreakdown);
}

function exportRevenue({ start, end, day, week, month, year, format = 'csv', breakdown = 'day', userId, user }) {
  const data = getRevenue({ start, end, day, week, month, year, breakdown, userId, user });
  const normalizedFormat = format.toLowerCase();

  if (normalizedFormat === 'csv' || normalizedFormat === 'excel') {
    const rows = Array.isArray(data) ? data : [{ period: 'total', total: data.total }];
    const header = 'period,total';
    const lines = rows.map(r => `${r.period},${r.total}`);
    const body = [header, ...lines].join('\n');
    const contentType = normalizedFormat === 'excel'
      ? 'application/vnd.ms-excel'
      : 'text/csv';
    const filename = normalizedFormat === 'excel' ? 'relatorio.xlsx' : 'relatorio.csv';
    return { contentType, body, filename };
  }

  if (normalizedFormat === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.fontSize(18).text('Relatorio de Faturamento', { align: 'center' });
    doc.moveDown();
    const rows = Array.isArray(data) ? data : [{ period: 'total', total: data.total }];
    doc.fontSize(12);
    rows.forEach(r => doc.text(`${r.period}: R$ ${r.total.toFixed(2)}`));
    doc.end();
    return new Promise(resolve => {
      doc.on('end', () => {
        resolve({ contentType: 'application/pdf', body: Buffer.concat(chunks), filename: 'relatorio.pdf' });
      });
    });
  }
  const err = buildError('Formato invalido');
  throw err;
}

function getFinancialPerformance({ start, end, day, week, month, year, breakdown, userId, user }) {
  const normalizedBreakdown = validateBreakdown(breakdown || 'total');
  const { startDate, endDate } = resolveTemporalRange({ start, end, day, week, month, year });
  const ownerId = resolveUserId(userId, user);
  const sales = revenueBetween(startDate, endDate, ownerId);
  const total = sales.reduce(
    (acc, sale) => {
      const revenue = sale.total || 0;
      const cmv = sale.cmv || 0;
      acc.revenue += revenue;
      acc.cmv += cmv;
      acc.profit += revenue - cmv;
      acc.count += 1;
      return acc;
    },
    { revenue: 0, cmv: 0, profit: 0, count: 0 }
  );

  const baseMetrics = {
    revenue: Number(total.revenue.toFixed(2)),
    cmv: Number(total.cmv.toFixed(2)),
    profit: Number(total.profit.toFixed(2)),
    margin: total.revenue > 0 ? total.profit / total.revenue : 0,
    avgTicket: total.count > 0 ? Number((total.revenue / total.count).toFixed(2)) : 0,
    salesCount: total.count,
  };

  if (normalizedBreakdown === 'total') return baseMetrics;
  if (!['day', 'week', 'month', 'year'].includes(normalizedBreakdown)) {
    const err = new Error('Parametro breakdown invalido');
    err.status = 400;
    throw err;
  }

  const buckets = {};

  sales.forEach((sale) => {
    const d = new Date(sale.date);
    let key = '';
    if (normalizedBreakdown === 'day') key = toIsoDay(d);
    else if (normalizedBreakdown === 'week') key = toWeekKeyUTC(d);
    else if (normalizedBreakdown === 'month') key = toMonthKeyUTC(d);
    else key = String(d.getUTCFullYear());

    buckets[key] = buckets[key] || [];
    buckets[key].push(sale);
  });

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, list]) => {
      const revenue = list.reduce((sum, s) => sum + (s.total || 0), 0);
      const cmv = list.reduce((sum, s) => sum + (s.cmv || 0), 0);
      const profit = revenue - cmv;
      const count = list.length;
      return {
        period,
        revenue: Number(revenue.toFixed(2)),
        cmv: Number(cmv.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        margin: revenue > 0 ? profit / revenue : 0,
        avgTicket: count > 0 ? Number((revenue / count).toFixed(2)) : 0,
        salesCount: count,
      };
    });
}

module.exports = { getRevenue, exportRevenue, getFinancialPerformance };
