require("./auth/config"); // valida os segredos JWT em producao no carregamento (precisa vir primeiro)
const { JWT_TTL_SECONDS, JWT_SECRET, JWT_REFRESH_SECRET, JWT_REFRESH_TTL_SECONDS, JWT_REFRESH_PREVIOUS_SECRET, MAX_FAILED_ATTEMPTS, BLOCK_DURATION_MS, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, RESET_TOKEN_TTL_MINUTES, RESET_TOKEN_SECRET, WEB_BASE_URL, EMAIL_VERIFY_TOKEN_SECRET } = require("./auth/config");
const { MESSAGES } = require("./auth/messages");
const { getUserByEmail, getUserById } = require("./auth/userLookup");
const { validateEmail, validatePassword, validateCredentials } = require("./auth/validators");
const { computeStatus, clearAttempts, isBlocked, buildFailedLoginError } = require("./auth/lockout");
const { hashResetToken, hashEmailVerificationToken, buildResetLink, issueTokens } = require("./auth/tokens");
const { login, logout, refresh } = require("./auth/sessionFlow");
const { registerUser, forgotPassword, resetPassword, changePassword, verifyEmail, updateProfile } = require("./auth/accountFlow");

module.exports = {
  login,
  refresh,
  logout,
  registerUser,
  getUserById,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  updateProfile,
  MESSAGES,
};
