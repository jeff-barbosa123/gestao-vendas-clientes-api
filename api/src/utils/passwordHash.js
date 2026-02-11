const bcrypt = require("bcrypt");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

/**
 * Hash a password using bcrypt
 * @param {string} plainPassword - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plain password with a hashed password
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if passwords match
 */
async function comparePassword(plainPassword, hashedPassword) {
  if (!plainPassword || typeof plainPassword !== "string") {
    return false;
  }
  if (!hashedPassword || typeof hashedPassword !== "string") {
    return false;
  }
  
  // Handle legacy plain text passwords during migration
  // TODO: Remove this after all passwords are migrated
  if (!hashedPassword.startsWith("$2b$") && !hashedPassword.startsWith("$2a$") && !hashedPassword.startsWith("$2y$")) {
    // Legacy plain text comparison (for migration period only)
    const matches = plainPassword === hashedPassword;
    // Auto-upgrade: if match found, hash the password for next time
    if (matches) {
      // This will be handled by the migration script
      return true;
    }
    return false;
  }
  
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Check if a password hash is using bcrypt format
 * @param {string} hash - Password hash to check
 * @returns {boolean} True if hash is bcrypt format
 */
function isBcryptHash(hash) {
  if (!hash || typeof hash !== "string") {
    return false;
  }
  return hash.startsWith("$2b$") || hash.startsWith("$2a$") || hash.startsWith("$2y$");
}

module.exports = {
  hashPassword,
  comparePassword,
  isBcryptHash,
};
