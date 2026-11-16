/**
 * Utilitários comuns do frontend (window.SGVC.utils).
 * Deve ser carregado antes dos scripts de página.
 */
(() => {
  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
  }

  // Número no padrão pt-BR com 2 casas (ex.: 2.100,00). '-' para valores inválidos.
  function formatMoney(value) {
    if (value === null || value === undefined || value === '') return '-';
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatCurrency(value) {
    const money = formatMoney(value);
    return money === '-' ? '-' : `R$ ${money}`;
  }

  function debounce(fn, wait = 300) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Mensagem amigável (pt-BR) para qualquer erro vindo do cliente de API.
  function normalizeError(err) {
    const handler = window.SGVCErrorHandler;
    if (handler && typeof handler.normalizeApiError === 'function') {
      return handler.normalizeApiError(err);
    }
    return err && err.message ? err.message : 'Erro ao processar sua solicitação. Tente novamente.';
  }

  window.SGVC = window.SGVC || {};
  window.SGVC.utils = { escapeHtml, formatMoney, formatCurrency, debounce, normalizeError };
})();
