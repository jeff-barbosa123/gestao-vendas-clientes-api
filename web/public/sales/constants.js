/**
 * Constantes da tela de vendas (formas de pagamento, chaves e limites).
 */
// Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
export const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

const PAYMENT_LABELS = {
  PIX: 'Pix',
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
  OTHER: 'Outro',
};

export const paymentLabel = (value) => PAYMENT_LABELS[value] || 'Não informado';

export const PAGE_SIZE = 10;

export const SALES_FILTER_KEY = 'sgvc.salesFilters';

export const META_OPEN = '<sgvc-meta>';

export const META_CLOSE = '</sgvc-meta>';

const session = { token: null }; // Auth via cookie HttpOnly (não usar token no browser storage)

export const storedFilters = sessionStorage.getItem(SALES_FILTER_KEY);
