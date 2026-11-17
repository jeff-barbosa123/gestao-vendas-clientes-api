const { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } = require("./config");
const { MESSAGES } = require("./messages");

function sanitizeEmail(email) {
  if (typeof email !== "string") return email;
  return email.trim().toLowerCase();
}

function sanitizePassword(password) {
  if (typeof password !== "string") return password;
  return password.trim();
}

function validateEmail(rawEmail, passwordProvided) {
  if (rawEmail === undefined && !passwordProvided) {
    const err = new Error(MESSAGES.emailPasswordRequired);
    err.status = 400;
    throw err;
  }
  if (rawEmail === undefined || rawEmail === null) {
    const err = new Error(MESSAGES.emailRequired);
    err.status = 400;
    throw err;
  }
  if (typeof rawEmail !== "string") {
    const err = new Error(MESSAGES.invalidEmail);
    err.status = 400;
    throw err;
  }

  const email = sanitizeEmail(rawEmail);
  if (!email) {
    const err = new Error(MESSAGES.emailRequired);
    err.status = 400;
    throw err;
  }

  const strictEmailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!strictEmailRegex.test(email)) {
    const err = new Error(MESSAGES.invalidEmail);
    err.status = 400;
    throw err;
  }

  return email;
}

const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/;

function normalizeUsername(raw) {
  return typeof raw === "string" ? raw.trim().toLowerCase() : raw;
}

function isValidUsername(raw) {
  return typeof raw === "string" && USERNAME_REGEX.test(normalizeUsername(raw));
}

// Username opcional: vazio/undefined/null => null; invalido => 400
function validateOptionalUsername(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    const err = new Error(MESSAGES.invalidUsername);
    err.status = 400;
    throw err;
  }
  const username = normalizeUsername(raw);
  if (!username) return null;
  if (!USERNAME_REGEX.test(username)) {
    const err = new Error(MESSAGES.invalidUsername);
    err.status = 400;
    throw err;
  }
  return username;
}

// Login: aceita e-mail (contem '@') ou username
function validateIdentifier(rawIdentifier, passwordProvided) {
  if (typeof rawIdentifier === "string" && rawIdentifier.includes("@")) {
    return validateEmail(rawIdentifier, passwordProvided);
  }
  if (rawIdentifier === undefined || rawIdentifier === null || typeof rawIdentifier !== "string") {
    return validateEmail(rawIdentifier, passwordProvided);
  }
  const identifier = normalizeUsername(rawIdentifier);
  if (!identifier) {
    const err = new Error(MESSAGES.emailRequired);
    err.status = 400;
    throw err;
  }
  if (!USERNAME_REGEX.test(identifier)) {
    const err = new Error(MESSAGES.invalidIdentifier);
    err.status = 400;
    throw err;
  }
  return identifier;
}

function validatePasswordStrength(password) {
  if (password.length < 8) {
    const err = new Error(MESSAGES.passwordShort);
    err.status = 400;
    throw err;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    const err = new Error(MESSAGES.passwordLong);
    err.status = 400;
    throw err;
  }
  
  // Strong password validation: at least one uppercase, one lowercase, one number, one special char
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  
  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    const err = new Error(MESSAGES.passwordWeak);
    err.status = 400;
    throw err;
  }
  
  return true;
}

function validatePassword(rawPassword, requireStrength = true) {
  if (rawPassword === undefined || rawPassword === null) {
    const err = new Error(MESSAGES.passwordRequired);
    err.status = 400;
    throw err;
  }
  if (typeof rawPassword !== "string") {
    const err = new Error(MESSAGES.invalidPasswordType);
    err.status = 400;
    throw err;
  }

  const password = sanitizePassword(rawPassword);
  if (!password) {
    const err = new Error(MESSAGES.passwordRequired);
    err.status = 400;
    throw err;
  }

  // Validação de tamanho mínimo só é necessária para registro/recuperação (requireStrength = true)
  // No login (requireStrength = false), aceitamos qualquer senha não vazia para compatibilidade com senhas antigas
  if (requireStrength && password.length < MIN_PASSWORD_LENGTH) {
    const err = new Error(MESSAGES.passwordShort);
    err.status = 400;
    throw err;
  }
  
  // Tamanho máximo sempre deve ser validado
  if (password.length > MAX_PASSWORD_LENGTH) {
    const err = new Error(MESSAGES.passwordLong);
    err.status = 400;
    throw err;
  }
  
  // Validação de força só para registro/recuperação/alteração de senha
  if (requireStrength) {
    validatePasswordStrength(password);
  }
  
  return password;
}

function validateCredentials(rawEmail, rawPassword) {
  const emailProvided = rawEmail !== undefined;
  const passwordProvided = rawPassword !== undefined;
  if (!emailProvided && !passwordProvided) {
    const err = new Error(MESSAGES.emailPasswordRequired);
    err.status = 400;
    throw err;
  }
  const email = validateIdentifier(rawEmail, passwordProvided);
  // No login, NÃO validamos força da senha (requireStrength = false)
  // A validação de força só acontece em registro/recuperação/alteração de senha
  const password = validatePassword(rawPassword, false);
  return { email, password };
}

module.exports = {
  sanitizeEmail,
  sanitizePassword,
  validateEmail,
  validateIdentifier,
  validateOptionalUsername,
  normalizeUsername,
  isValidUsername,
  validatePasswordStrength,
  validatePassword,
  validateCredentials,
};
