const jwt = require("jsonwebtoken");
const { tokenStore } = require("../models/db");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_PREVIOUS_SECRET = process.env.JWT_PREVIOUS_SECRET;
const INACTIVITY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

const MSG_FORBIDDEN = "Acesso negado";
const MSG_SESSION_EXPIRED = "Sess\u00e3o expirada, fa\u00e7a login novamente";

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

function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    console.error("Token ausente");
    return res.status(403).json({ success: false, message: MSG_FORBIDDEN, error: MSG_FORBIDDEN });
  }
  try {
    console.log("Validando token:", token);
    const payload = verifyWithRotation(token);
    console.log("Token válido. Usuário:", payload);
    const entry = tokenStore.get(payload.jti);
    if (!entry || entry.revoked) {
      return res.status(401).json({ success: false, message: MSG_FORBIDDEN, error: MSG_FORBIDDEN });
    }
    const now = Date.now();
    if (now - entry.lastActivity > INACTIVITY_WINDOW_MS) {
      entry.revoked = true;
      return res.status(401).json({ success: false, message: MSG_SESSION_EXPIRED, error: MSG_SESSION_EXPIRED });
    }
    entry.lastActivity = now;
    req.user = { id: entry.userId, email: entry.email };
    req.auth = { jti: payload.jti };
    next();
  } catch (err) {
    console.error("Erro ao validar token:", err.message);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: MSG_SESSION_EXPIRED, error: MSG_SESSION_EXPIRED });
    }
    return res.status(401).json({ success: false, message: MSG_FORBIDDEN, error: MSG_FORBIDDEN });
  }
}

module.exports = { authenticate };
