/**
 * Controller para Analytics de Erros
 */

const errorAnalytics = require('../models/errorAnalytics');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * GET /api/errors/analytics/frequent
 * Busca erros mais frequentes
 */
async function getFrequentErrors(req, res, next) {
  try {
    const {
      limit = 10,
      startDate,
      endDate,
      statusCode,
      errorCode,
    } = req.query;

    const options = {
      limit: parseInt(limit, 10),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      statusCode: statusCode ? parseInt(statusCode, 10) : null,
      errorCode: errorCode || null,
    };

    const errors = await errorAnalytics.getMostFrequentErrors(options);
    res.json({ success: true, data: errors });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/errors/analytics/timeline
 * Busca erros por período (timeline)
 */
async function getErrorsTimeline(req, res, next) {
  try {
    const {
      period = 'day',
      startDate,
      endDate,
    } = req.query;

    if (!['day', 'hour'].includes(period)) {
      const err = new Error('Período inválido. Use "day" ou "hour"');
      err.status = 400;
      err.code = 'INVALID_PERIOD';
      return next(err);
    }

    const timeline = await errorAnalytics.getErrorsByTimePeriod(
      period,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

    res.json({ success: true, data: timeline });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/errors/analytics/endpoints
 * Busca endpoints com mais erros
 */
async function getEndpointsWithErrors(req, res, next) {
  try {
    const {
      limit = 10,
      startDate,
      endDate,
    } = req.query;

    const endpoints = await errorAnalytics.getEndpointsWithMostErrors(
      parseInt(limit, 10),
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

    res.json({ success: true, data: endpoints });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/errors/analytics/recent
 * Busca erros recentes
 */
async function getRecentErrors(req, res, next) {
  try {
    const {
      hours = 24,
      limit = 100,
    } = req.query;

    const errors = await errorAnalytics.getRecentErrors(
      parseInt(hours, 10),
      parseInt(limit, 10)
    );

    res.json({ success: true, data: errors });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/errors/analytics/statistics
 * Estatísticas gerais de erros
 */
async function getErrorStatistics(req, res, next) {
  try {
    const {
      startDate,
      endDate,
    } = req.query;

    const stats = await errorAnalytics.getErrorStatistics(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

    res.json({ success: true, data: stats });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getFrequentErrors,
  getErrorsTimeline,
  getEndpointsWithErrors,
  getRecentErrors,
  getErrorStatistics,
};
