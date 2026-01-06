// Auth tracking (in-memory)
const failedAttempts = new Map();
const tokenStore = new Map();
const refreshStore = new Map();

module.exports = {
  failedAttempts,
  tokenStore,
  refreshStore,
};
