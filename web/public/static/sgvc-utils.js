(() => {
  function safeString(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
  }

  function safeValue(value, fallback = '') {
    const normalized = safeString(value);
    if (normalized !== '') return normalized;
    return safeString(fallback);
  }

  window.safeString = safeString;
  window.safeValue = safeValue;
})();
