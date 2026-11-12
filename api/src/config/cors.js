// Configuração de CORS da API (extraída do app.js; comportamento idêntico).
//
// Regras:
// - Requisições sem Origin (apps mobile, curl) são permitidas.
// - O frontend de desenvolvimento (localhost:4000) é sempre permitido.
// - Fora de produção: qualquer localhost/127.0.0.1 + o que estiver em ALLOWED_ORIGINS.
// - Em produção: só o que estiver em ALLOWED_ORIGINS (obrigatório configurar).

const DEV_FRONTEND_ORIGIN = "http://localhost:4000";

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function isLocalOrigin(origin) {
  return origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
}

function originCallback(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (origin === DEV_FRONTEND_ORIGIN) {
    callback(null, true);
    return;
  }

  if (process.env.NODE_ENV === "production") {
    if (allowedOrigins.length === 0) {
      const { logError } = require("../utils/logger");
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
    callback(null, true);
    return;
  }

  // Fora de produção: localhost + o que estiver em ALLOWED_ORIGINS.
  // (Antes qualquer origem era aceita com cookies/credentials em dev/homologação.)
  if (isLocalOrigin(origin) || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(null, false);
}

const corsOptions = {
  origin: originCallback,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-timezone", "X-CSRF-Token"],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 86400, // 24 horas
};

module.exports = { corsOptions, allowedOrigins };
