// Carregar variáveis de ambiente por ambiente
// Suporta: .env.local, .env.hmg, .env.production, ou .env padrão
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

const env = process.env.NODE_ENV || 'development';
let envFile = '.env';

if (process.env.ENV_FILE) {
  // Permite especificar arquivo via variável de ambiente
  envFile = process.env.ENV_FILE;
} else if (env === 'production') {
  envFile = '.env.production';
} else if (env === 'staging' || env === 'hmg') {
  envFile = '.env.hmg';
} else {
  envFile = '.env.local';
}

// Tentar carregar arquivo específico, fallback para .env
const envPath = path.join(__dirname, "..", envFile);
const defaultEnvPath = path.join(__dirname, "..", ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`📄 Ambiente carregado de: ${envFile}`);
} else if (fs.existsSync(defaultEnvPath)) {
  dotenv.config({ path: defaultEnvPath });
  console.log(`📄 Ambiente carregado de: .env (padrão)`);
} else {
  console.warn(`⚠️  Nenhum arquivo .env encontrado. Usando variáveis de ambiente do sistema.`);
  console.warn(`💡 Dica: Copie um arquivo de exemplo (env.local.example, env.hmg.example, ou env.production.example)`);
}

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
  allowedHeaders: ["Content-Type", "Authorization", "x-timezone"],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(requestLogger);
app.use(metricsMiddleware);
app.use(auditLogger);

// Cookie parser para i18n (detectar locale de cookie) - opcional
try {
  const cookieParser = require("cookie-parser");
  app.use(cookieParser());
} catch (e) {
  // cookie-parser não está instalado - i18n funcionará sem ele
  // Instale com: npm install cookie-parser
}

// i18n middleware (deve vir antes das rotas)
app.use(i18nMiddleware);

app.use(express.json({ limit: process.env.JSON_LIMIT || "1mb" }));

// Validação global de Content-Type (deve vir após express.json)
const { validateContentType } = require("./middleware/validateContentType");
app.use(validateContentType);

// Swagger Docs - apenas se habilitado (desabilitado em produção por padrão)
const enableSwagger = process.env.ENABLE_SWAGGER_UI !== 'false';
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

// Prometheus metrics
app.get("/metrics", (_req, res) => {
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
