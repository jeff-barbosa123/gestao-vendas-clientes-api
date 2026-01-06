const reportsService = require("../services/reportsService");
const { buildError, validateTimezone } = require("../utils/dateValidation");

function validateQueryKeys(query, allowedKeys) {
  const invalid = Object.keys(query || {}).filter((key) => !allowedKeys.includes(key));
  if (invalid.length > 0) {
    throw buildError("Par\u00e2metros inv\u00e1lidos");
  }
}

function validateTimezoneInput(req) {
  const tz = req.query.timezone || req.headers["x-timezone"];
  validateTimezone(tz);
}

async function revenueSummary(req, res, next) {
  try {
    validateQueryKeys(req.query, ["start", "end", "breakdown", "day", "week", "month", "year", "timezone", "userId"]);
    validateTimezoneInput(req);
    const { start, end, breakdown, day, week, month, year, userId } = req.query;
    const result = await reportsService.getRevenue({
      start,
      end,
      breakdown,
      day,
      week,
      month,
      year,
      userId,
      user: req.user,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function exportRevenue(req, res, next) {
  try {
    validateQueryKeys(req.query, [
      "start",
      "end",
      "format",
      "breakdown",
      "day",
      "week",
      "month",
      "year",
      "timezone",
      "userId",
    ]);
    validateTimezoneInput(req);
    const { start, end, format = "csv", breakdown = "day", day, week, month, year, userId } = req.query;
    const result = await reportsService.exportRevenue({
      start,
      end,
      format,
      breakdown,
      day,
      week,
      month,
      year,
      userId,
      user: req.user,
    });
    res.setHeader("Content-Type", result.contentType);
    const filename = result.filename || (format.toLowerCase() === "pdf" ? "relatorio.pdf" : "relatorio.csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(result.body);
  } catch (e) {
    next(e);
  }
}

async function financialReport(req, res, next) {
  try {
    validateQueryKeys(req.query, ["start", "end", "breakdown", "day", "week", "month", "year", "timezone", "userId"]);
    validateTimezoneInput(req);
    const { start, end, breakdown, day, week, month, year, userId } = req.query;
    const result = await reportsService.getFinancialPerformance({
      start,
      end,
      breakdown,
      day,
      week,
      month,
      year,
      userId,
      user: req.user,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

module.exports = { revenueSummary, exportRevenue, financialReport };
