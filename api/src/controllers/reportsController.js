const reportsService = require('../services/reportsService');

async function revenueSummary(req, res, next) {
  try {
    const { start, end, breakdown, day, week, month, year } = req.query;
    const result = reportsService.getRevenue({ start, end, breakdown, day, week, month, year });
    res.json(result);
  } catch (e) { next(e); }
}

async function exportRevenue(req, res, next) {
  try {
    const { start, end, format = 'csv', breakdown = 'day', day, week, month, year } = req.query;
    const result = await reportsService.exportRevenue({ start, end, format, breakdown, day, week, month, year });
    res.setHeader('Content-Type', result.contentType);
    const filename = result.filename || (format.toLowerCase() === 'pdf' ? 'relatorio.pdf' : 'relatorio.csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (result.contentType === 'application/pdf') {
      return res.send(result.body);
    }
    res.send(result.body);
  } catch (e) { next(e); }
}

async function financialReport(req, res, next) {
  try {
    const { start, end, breakdown, day, week, month, year } = req.query;
    const result = reportsService.getFinancialPerformance({ start, end, breakdown, day, week, month, year });
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = { revenueSummary, exportRevenue, financialReport };
