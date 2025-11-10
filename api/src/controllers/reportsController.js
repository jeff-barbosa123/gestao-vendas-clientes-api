const reportsService = require('../services/reportsService');

async function revenueSummary(req, res, next) {
  try {
    const { start, end, breakdown } = req.query;
    const result = reportsService.getRevenue({ start, end, breakdown });
    res.json(result);
  } catch (e) { next(e); }
}

async function exportRevenue(req, res, next) {
  try {
    const { start, end, format = 'csv', breakdown = 'day' } = req.query;
    const result = await reportsService.exportRevenue({ start, end, format, breakdown });
    res.setHeader('Content-Type', result.contentType);
    if (result.contentType === 'application/pdf') {
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio.pdf"');
      return res.send(result.body);
    }
    res.send(result.body);
  } catch (e) { next(e); }
}

module.exports = { revenueSummary, exportRevenue };

