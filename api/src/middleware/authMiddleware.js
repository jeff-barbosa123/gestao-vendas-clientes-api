const jwt = require("jsonwebtoken");
const sessionStore = require("../services/sessionStore");

// Validate JWT_SECRET - only allow default in development
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? null : "dev-secret");
const JWT_PREVIOUS_SECRET = process.env.JWT_PREVIOUS_SECRET;
const INACTIVITY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be configured in production");
}

const { ERROR_MESSAGES } = require("../utils/errorMessages");

const MSG_FORBIDDEN = ERROR_MESSAGES.FORBIDDEN;
const MSG_SESSION_EXPIRED = ERROR_MESSAGES.SESSION_EXPIRED;

function verifyWithRotation(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (JWT_PREVIOUS_SECRET) {
      try {
        return jwt.verify(token, JWT_PREVIOUS_SECRET);
      } catch (err2) {
        throw err2;
      }
    }
    throw err;
  }
}

async function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  // Back-compat: Authorization header wins; fallback to HttpOnly cookie.
  const token =
    (authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null) ||
    (req.cookies && req.cookies.sgvc_token ? req.cookies.sgvc_token : null);
  if (!token) {
    // Log only the event, not the token itself
    const { logError } = require("../utils/logger");
    logError({
      event: "AUTH_TOKEN_MISSING",
      path: req.originalUrl,
      method: req.method,
    });
    return res.status(401).json({ success: false, message: MSG_FORBIDDEN, error: MSG_FORBIDDEN });
  }
  try {
    const payload = verifyWithRotation(token);
    // Cache em memória; após reinício da API a sessão é carregada do PostgreSQL
    const entry = await sessionStore.get("access", payload.jti);
    if (!entry || entry.revoked) {
      const { logError } = require("../utils/logger");
      logError({
        event: "AUTH_TOKEN_INVALID",
        jti: payload.jti ? `${payload.jti.substring(0, 8)}...` : "unknown",
        path: req.originalUrl,
      });
      return res.status(401).json({ success: false, message: MSG_FORBIDDEN, error: MSG_FORBIDDEN });
    }
    const now = Date.now();
    if (now - entry.lastActivity > INACTIVITY_WINDOW_MS) {
      await sessionStore.revoke("access", payload.jti);
      return res.status(401).json({ success: false, message: MSG_SESSION_EXPIRED, error: MSG_SESSION_EXPIRED });
    }
    sessionStore.touch(entry, now);
    req.user = { id: entry.userId, email: entry.email };
    req.auth = { jti: payload.jti };
    next();
  } catch (err) {
    // Log error without exposing token
    const { logError } = require("../utils/logger");
    logError({
      event: "AUTH_TOKEN_VALIDATION_ERROR",
      error: err.name,
      path: req.originalUrl,
    });
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: MSG_SESSION_EXPIRED, error: MSG_SESSION_EXPIRED });
    }
    return res.status(401).json({ success: false, message: MSG_FORBIDDEN, error: MSG_FORBIDDEN });
  }
}

module.exports = { authenticate };
