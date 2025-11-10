const PDFDocument = require('pdfkit');
const { revenueBetween } = require('../models/db');

function summarize(sales, granularity = 'total') {
  if (granularity === 'total') {
    return { total: sales.reduce((s, v) => s + v.total, 0) };
  }
  const buckets = {};
  for (const s of sales) {
    const d = new Date(s.date);
    let key = '';
    if (granularity === 'day') {
      key = d.toISOString().slice(0, 10);
    } else if (granularity === 'week') {
      const temp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const dayNum = temp.getUTCDay() || 7;
      temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
      key = `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    } else if (granularity === 'month') {
      key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    buckets[key] = (buckets[key] || 0) + s.total;
  }
  return Object.entries(buckets).map(([period, total]) => ({ period, total }));
}

function getRevenue({ start, end, breakdown }) {
  const sales = revenueBetween(start, end);
  if (!breakdown || breakdown === 'total') return summarize(sales, 'total');
  if (!['day', 'week', 'month'].includes(breakdown)) {
    const err = new Error('Parâmetro breakdown inválido');
    err.status = 400; throw err;
  }
  return summarize(sales, breakdown);
}

function exportRevenue({ start, end, format = 'csv', breakdown = 'day' }) {
  const data = getRevenue({ start, end, breakdown });
  if (format === 'csv' || format === 'excel') {
    const rows = Array.isArray(data) ? data : [{ period: 'total', total: data.total }];
    const header = 'period,total';
    const lines = rows.map(r => `${r.period},${r.total}`);
    return { contentType: 'text/csv', body: [header, ...lines].join('\n') };
  }
  if (format === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {});
    doc.fontSize(18).text('Relatório de Faturamento', { align: 'center' });
    doc.moveDown();
    const rows = Array.isArray(data) ? data : [{ period: 'total', total: data.total }];
    doc.fontSize(12);
    rows.forEach(r => doc.text(`${r.period}: R$ ${r.total.toFixed(2)}`));
    doc.end();
    return new Promise(resolve => {
      doc.on('end', () => {
        resolve({ contentType: 'application/pdf', body: Buffer.concat(chunks) });
      });
    });
  }
  const err = new Error('Formato inválido');
  err.status = 400; throw err;
}

module.exports = { getRevenue, exportRevenue };

