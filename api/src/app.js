require("dotenv").config(); // carrega as variáveis do arquivo .env logo no início

const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");
const { requestLogger } = require("./middleware/requestLogger");
const { securityHeaders } = require("./middleware/securityHeaders");
const { auditLogger } = require("./middleware/auditLogger");
const { metricsMiddleware, renderPrometheus } = require("./middleware/metrics");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("../resources/swagger.json");
const { URL } = require("url");

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0) return callback(null, true);
    try {
      const normalized = new URL(origin).origin;
      if (allowedOrigins.includes(normalized)) return callback(null, true);
      return callback(new Error("Origin not allowed"));
    } catch (err) {
      return callback(new Error("Origin not allowed"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(requestLogger);
app.use(metricsMiddleware);
app.use(auditLogger);
app.use(express.json({ limit: process.env.JSON_LIMIT || "1mb" }));

// Swagger Docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Prometheus metrics
app.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4");
  res.send(renderPrometheus());
});

// Rotas da API
app.use("/api", routes);

// Tratamento de erros
app.use(errorHandler);

module.exports = app;
