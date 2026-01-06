require("dotenv").config(); // carrega as variaveis do arquivo .env

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");
const { requestLogger } = require("./middleware/requestLogger");
const { securityHeaders } = require("./middleware/securityHeaders");
const { auditLogger } = require("./middleware/auditLogger");
const { metricsMiddleware, renderPrometheus } = require("./middleware/metrics");
const swaggerUi = require("swagger-ui-express");
const { URL } = require("url");

const app = express();

const swaggerPath = path.resolve(__dirname, "../resources/swagger.json");

// const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
//   .split(",")
//   .map((o) => o.trim())
//   .filter(Boolean);

const corsOptions = {
  origin: '*',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(requestLogger);
app.use(metricsMiddleware);
app.use(auditLogger);

app.use(express.json({ limit: process.env.JSON_LIMIT || "1mb" }));

// Swagger Docs (load from file to avoid stale cache)
app.get("/api-docs/swagger.json", (_req, res, next) => {
  try {
    const doc = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));
    res.setHeader("Cache-Control", "no-store");
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(null, { swaggerOptions: { url: "/api-docs/swagger.json" } })
);

// Prometheus metrics
app.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4");
  res.send(renderPrometheus());
});

// Health check endpoint for production readiness (no auth, no sensitive data)
app.get("/health", (_req, res) => {
  const payload = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  // // Optional: extend this handler to validate PostgreSQL connectivity
  // // const dbCheck = await pool.query("SELECT 1");
  // // payload.database = dbCheck.rowCount === 1 ? "ok" : "unhealthy";

  // // Optional: expose lightweight memory stats for quick diagnostics
  // // const memoryUsage = process.memoryUsage();
  // // payload.memory = {
  // //   heapUsed: memoryUsage.heapUsed,
  // //   rss: memoryUsage.rss,
  // // };

  res.status(200).json(payload);
});

// Rotas da API
app.use("/api", routes);

// Tratamento de erros
app.use(errorHandler);

module.exports = app;
