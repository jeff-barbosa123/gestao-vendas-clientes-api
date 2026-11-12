// Carrega o arquivo .env do ambiente (local, test, hmg, production) antes de tudo
require("./config/loadEnv");
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
const { i18nMiddleware } = require("./utils/i18n");
const swaggerUi = require("swagger-ui-express");
const { URL } = require("url");

const app = express();

// Confiança no proxy (necessário para obter IP real e HTTPS redirect)
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

// Rate limiting global
try {
  const { rateLimit } = require("./middleware/rateLimit");
  // `rateLimit` é um factory que retorna o middleware.
  // Se passarmos a função factory direto para o Express (sem invocar),
  // a requisição entra mas nunca recebe resposta (não há `next()` nesse caminho).
  // Limite global por IP. Precisa ser alto: cada tela do frontend faz várias chamadas.
  // (O default do factory em produção é 5 req/min — pensado para rotas sensíveis, não para a API toda.)
  app.use(rateLimit({ windowMs: 60_000, max: Number(process.env.GLOBAL_RATE_LIMIT_MAX) || 300 }));
} catch (e) {
  // Middleware opcional não bloqueia o boot se ausente em dev
}
const swaggerPath = path.resolve(__dirname, "../resources/swagger.json");

// CORS configuration - only allow specific origins in production
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) {
      callback(null, true);
      return;
    }
    // Always allow frontend dev server
    if (origin === "http://localhost:4000") {
      callback(null, true);
      return;
    }
    
    // In development, allow localhost
    if (process.env.NODE_ENV !== "production") {
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        callback(null, true);
        return;
      }
    }
    
    // In production, require whitelist
    if (process.env.NODE_ENV === "production") {
      if (allowedOrigins.length === 0) {
        const { logError } = require("./utils/logger");
        logError({
          event: "CORS_CONFIGURATION_ERROR",
          message: "ALLOWED_ORIGINS must be configured in production",
        });
        callback(new Error("CORS configuration error: ALLOWED_ORIGINS not set"), false);
        return;
      }
      if (!allowedOrigins.includes(origin)) {
        callback(new Error("Not allowed by CORS"), false);
        return;
      }
    }
    
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-timezone", "X-CSRF-Token"],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(requestLogger);
app.use(metricsMiddleware);
app.use(auditLogger);

// Cookie parser é obrigatório para auth via cookie + CSRF double-submit
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// CSRF (double-submit cookie)
const { ensureCsrfCookie, csrfProtect } = require("./middleware/csrf");
app.use(ensureCsrfCookie);
app.use(csrfProtect);

// i18n middleware (deve vir antes das rotas)
app.use(i18nMiddleware);

app.use(express.json({ limit: process.env.JSON_LIMIT || "1mb" }));

// Validação global de Content-Type (deve vir após express.json)
const { validateContentType } = require("./middleware/validateContentType");
app.use(validateContentType);

// Swagger Docs - apenas se habilitado (desabilitado em produção por padrão)
// Produção: default OFF; Não-produção: default ON.
const enableSwagger =
  process.env.NODE_ENV === 'production'
    ? process.env.ENABLE_SWAGGER_UI === 'true'
    : process.env.ENABLE_SWAGGER_UI !== 'false';
if (enableSwagger) {
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
} else {
  // Bloquear acesso ao Swagger quando desabilitado (produção)
  app.get("/api-docs*", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
}

// Prometheus metrics (protegido em produção)
app.get("/metrics", (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    const allowed = (process.env.METRICS_ALLOWED_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
    const ip = (req.ip || '').replace('::ffff:', '');
    if (allowed.length && !allowed.includes(ip)) {
      return res.status(404).end();
    }
  }
  res.setHeader("Content-Type", "text/plain; version=0.0.4");
  res.send(renderPrometheus());
});

// Health check endpoint for production readiness (no auth, no sensitive data)
app.get("/health", async (_req, res) => {
  const payload = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  try {
    // Validate PostgreSQL connectivity (só se DATABASE_URL estiver configurado)
    if (process.env.DATABASE_URL) {
      const { pool } = require("./db");
      try {
        const dbCheck = await pool.query("SELECT 1 as health");
        payload.database = dbCheck.rowCount === 1 ? "ok" : "unhealthy";
      } catch (dbErr) {
        payload.database = "error";
        payload.databaseError = process.env.NODE_ENV === "production" ? "Database connection failed" : dbErr.message;
      }
    } else {
      payload.database = "not_configured";
      payload.databaseMessage = "DATABASE_URL not configured - running in development mode";
    }
    
    // Expose lightweight memory stats for quick diagnostics
    const memoryUsage = process.memoryUsage();
    payload.memory = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
    };
    
    // Check uptime
    payload.uptime = Math.round(process.uptime());
    
    // Overall health status
    if (payload.database !== "ok") {
      payload.status = "unhealthy";
      return res.status(503).json(payload);
    }
    
    res.status(200).json(payload);
  } catch (err) {
    payload.status = "unhealthy";
    payload.database = "error";
    payload.error = process.env.NODE_ENV === "production" ? "Database connection failed" : err.message;
    const { logError } = require("./utils/logger");
    logError({
      event: "HEALTH_CHECK_ERROR",
      error: err.message,
    });
    res.status(503).json(payload);
  }
});

// Rotas da API
app.use("/api", routes);

// Tratamento de erros
app.use(errorHandler);

module.exports = app;
