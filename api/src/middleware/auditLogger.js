const { logAudit } = require("../utils/logger");

const SENSITIVE_KEYS = ["password", "senha", "token", "refreshToken"];

function scrubBody(body) {
  if (!body || typeof body !== "object") return undefined;
  const clone = Array.isArray(body) ? [] : {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_KEYS.includes(key)) continue;
    if (typeof value === "object") {
      clone[key] = "[object]";
    } else {
      clone[key] = value;
    }
  }
  return Object.keys(clone).length ? clone : undefined;
}

function auditLogger(req, res, next) {
  const shouldAudit = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (!shouldAudit) return next();

  const start = Date.now();
  res.on("finish", () => {
    logAudit({
      event: "AUDIT",
      message: "Ação auditada",
      requestId: req.requestId,
      userId: req.user ? req.user.id : undefined,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
      body: scrubBody(req.body),
    });
  });

  next();
}

module.exports = { auditLogger };
