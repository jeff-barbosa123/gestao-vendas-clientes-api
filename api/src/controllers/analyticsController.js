const analyticsService = require("../services/analyticsService");

async function overview(req, res, next) {
  try {
    const { start, end, day, week, month, year } = req.query;
    const result = await analyticsService.getOverview({ start, end, day, week, month, year }, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function timeseries(req, res, next) {
  try {
    const { breakdown = "day", start, end, day, week, month, year } = req.query;
    const result = await analyticsService.buildTimeseries(breakdown, { start, end, day, week, month, year });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  overview,
  timeseries,
};
