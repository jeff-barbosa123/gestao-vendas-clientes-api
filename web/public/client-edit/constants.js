/**
 * Constantes da tela de edição de cliente.
 */
// Preferir same-origin por padrão (evita acidentalmente apontar para localhost em produção)
export const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

export const DELETE_FLAG = 'sgvc.clientDeleted';

export const UPDATED_FLAG = 'sgvc.clientUpdated';

export const ADDRESS_STREET_REQUIRED = 'Rua obrigatória.';

export const ADDRESS_STREET_LENGTH_MESSAGE = 'Informe o logradouro com pelo menos 3 caracteres.';

export const ADDRESS_STREET_INVALID_MESSAGE = 'Informe um logradouro válido.';

export const ADDRESS_STREET_INVALID_PATTERN = /<\s*\/?\s*script\b|<|>|--|;/i;

export const ADDRESS_STREET_MIN_LENGTH = 3;

export const ADDRESS_NUMBER_REQUIRED = 'Número obrigatório.';

export const ADDRESS_NUMBER_INVALID = 'Número inválido.';

const safeString = window.safeString || ((value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
});

export const safeValue = window.safeValue || ((value, fallback = '') => {
  const normalized = safeString(value);
  if (normalized !== '') return normalized;
  return safeString(fallback);
});

// Auth via cookie HttpOnly (token não deve existir no browser storage)
const session = { token: null };

export const META_OPEN = '<sgvc-meta>';

export const META_CLOSE = '</sgvc-meta>';

// Verificar se o ID do cliente foi fornecido na URL
export const params = new URLSearchParams(window.location.search);
