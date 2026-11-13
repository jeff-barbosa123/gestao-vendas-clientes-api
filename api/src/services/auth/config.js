const { getBlockDurationMs } = require("../../utils/authConfig");

// Validate required environment variables
// Only enforce in production to allow development/testing
if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev-secret" || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a secure value (min 32 characters) in production. Cannot use default 'dev-secret'.");
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === "dev-refresh-secret" || process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error("JWT_REFRESH_SECRET must be set to a secure value (min 32 characters) in production. Cannot use default 'dev-refresh-secret'.");
  }
}

const JWT_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS || 15 * 60); // 15 minutes

const JWT_SECRET = process.env.JWT_SECRET;

const JWT_PREVIOUS_SECRET = process.env.JWT_PREVIOUS_SECRET;

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const JWT_REFRESH_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL_SECONDS || 24 * 60 * 60); // 24 hours

const JWT_REFRESH_PREVIOUS_SECRET = process.env.JWT_REFRESH_PREVIOUS_SECRET;

const MAX_FAILED_ATTEMPTS = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 3);

const BLOCK_DURATION_MS = getBlockDurationMs();

const MIN_PASSWORD_LENGTH = Number(process.env.LOGIN_MIN_PASSWORD_LENGTH || 8);

const MAX_PASSWORD_LENGTH = Number(process.env.LOGIN_MAX_PASSWORD_LENGTH || 128);

const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 30);

const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || JWT_SECRET;

const WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:4000";

const EMAIL_VERIFY_TOKEN_SECRET = process.env.EMAIL_VERIFY_TOKEN_SECRET || JWT_SECRET;

module.exports = {
  JWT_TTL_SECONDS,
  JWT_SECRET,
  JWT_PREVIOUS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_TTL_SECONDS,
  JWT_REFRESH_PREVIOUS_SECRET,
  MAX_FAILED_ATTEMPTS,
  BLOCK_DURATION_MS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  RESET_TOKEN_TTL_MINUTES,
  RESET_TOKEN_SECRET,
  WEB_BASE_URL,
  EMAIL_VERIFY_TOKEN_SECRET,
};
