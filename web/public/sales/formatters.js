/**
 * Formatação de preço, datas, documentos, telefone, endereço e nomes.
 */
import { META_CLOSE, META_OPEN } from './constants.js';

export function formatPrice(value) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Fuso padrao da empresa (o mesmo de api/src/utils/businessDate.js).
const BUSINESS_TIME_ZONE = 'America/Fortaleza';

// Meia-noite UTC exata é venda "só data" (mantém o dia gravado, sem virar o dia anterior no Brasil).
// Qualquer outro horário (PDV, encomenda entregue) vale o dia no fuso da empresa.
function saleTimeZone(date) {
  return date.getTime() % 86400000 === 0 ? 'UTC' : BUSINESS_TIME_ZONE;
}

export function formatDateInput(value) {
  if (!value) return '';
  if (value instanceof Date) {
    // "Hoje" no fuso local (toISOString() viraria o dia seguinte depois das 21h)
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date
    .toLocaleDateString('pt-BR', { timeZone: saleTimeZone(date), day: '2-digit', month: '2-digit', year: 'numeric' })
    .split('/')
    .reverse()
    .join('-');
}

export function formatDateDisplay(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR', { timeZone: saleTimeZone(date) });
}

export function formatBirthDate(value) {
  if (!value) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split('-');
    return `${day}/${month}/${year}`;
  }
  return formatDateDisplay(value);
}

export function parseNotesMeta(value) {
  const payload = String(value || '');
  const start = payload.indexOf(META_OPEN);
  if (start === -1) {
    return { text: payload.trim(), metadata: {} };
  }
  const end = payload.indexOf(META_CLOSE, start);
  if (end === -1) {
    return { text: payload.trim(), metadata: {} };
  }
  const metaPart = payload.slice(start + META_OPEN.length, end).trim();
  let metadata = {};
  try {
    metadata = JSON.parse(metaPart);
  } catch (_err) {
    metadata = {};
  }
  const textOnly = payload.slice(0, start).trim();
  return { text: textOnly, metadata };
}

function formatCpf(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCnpj(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatDocument(value, type) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (type === 'PF') return formatCpf(digits);
  if (type === 'PJ') return formatCnpj(digits);
  if (digits.length === 11) return formatCpf(digits);
  if (digits.length === 14) return formatCnpj(digits);
  return digits;
}

export function getTypeLabel(type) {
  const normalized = String(type || '').trim().toUpperCase();
  if (normalized === 'PF') return 'Pessoa F\u00edsica (PF)';
  if (normalized === 'PJ') return 'Pessoa Jur\u00eddica (PJ)';
  return '';
}

export function formatAddress(customer) {
  if (!customer) return '-';
  const street = customer.addressStreet || customer.address_street || '';
  const number = customer.addressNumber || customer.address_number || '';
  const neighborhood = customer.addressNeighborhood || customer.address_neighborhood || '';
  const city = customer.addressCity || customer.address_city || '';
  const postal = customer.addressPostalCode || customer.address_postal_code || '';
  const complement = String(customer.complement || '').trim();
  const state = String(customer.addressState || customer.address_state || '').trim().toUpperCase();
  const streetLine = [street, number].filter(Boolean).join(', ');
  const neighborhoodCity = [neighborhood, city].filter(Boolean).join(' - ');
  const stateText = state ? `UF ${state}` : '';
  const complementText = complement ? `Complemento ${complement}` : '';
  const postalText = postal ? `CEP ${postal}` : '';
  const parts = [streetLine, complementText, neighborhoodCity, stateText, postalText].filter(Boolean);
  return parts.join(' - ') || '-';
}

export function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function normalizeName(value) {
  return normalizeKey(value);
}

export function escapeHtml(value) {
  return window.SGVC.utils.escapeHtml(value);
}

export function sanitizeFileName(value) {
  return String(value || 'venda')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return digits ? 'N\u00e3o informado' : '';
}
