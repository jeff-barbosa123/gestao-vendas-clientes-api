function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function getBlockDurationMs() {
  const explicit = parseNumber(process.env.LOGIN_BLOCK_MS);
  if (explicit != null) return explicit;
  const minutes = parseNumber(process.env.LOGIN_BLOCK_MINUTES);
  if (minutes != null) return minutes * 60 * 1000;
  return 15 * 60 * 1000;
}

module.exports = { getBlockDurationMs };
