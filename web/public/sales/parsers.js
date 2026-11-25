/**
 * Parsing de valores e datas, status e filtros de período.
 */
import { formatDateInput } from './formatters.js';
export function parsePrice(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  let normalized = raw.replace(/\s/g, '');
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');
  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, '');
  }
  if (hasComma) {
    normalized = normalized.replace(',', '.');
  }
  const number = Number(normalized);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number;
}

export function parseFilterMoney(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  let normalized = raw.replace(/\s/g, '');
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');
  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, '');
  }
  if (hasComma) {
    normalized = normalized.replace(',', '.');
  }
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

export function normalizeStatus(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'ACTIVE' || raw === 'ATIVA' || raw === 'ATIVO') {
    return { key: 'ATIVA', label: 'Ativa' };
  }
  if (raw === 'CANCELED' || raw === 'CANCELADA' || raw === 'CANCELADO') {
    return { key: 'CANCELADA', label: 'Cancelada' };
  }
  if (!raw) return { key: 'ATIVA', label: 'Ativa' };
  const lower = raw.toLowerCase();
  return { key: raw, label: lower.charAt(0).toUpperCase() + lower.slice(1) };
}

export function getSaleDate(sale) {
  const value = sale.date || sale.dataVenda || sale.saleDate || sale.createdAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "Hoje" no fuso padrao da empresa; nao depende do fuso do navegador.
function businessToday() {
  return new Date()
    .toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric' })
    .split('/')
    .reverse()
    .join('-');
}

function quarterOf(day) {
  return Math.floor((Number(day.slice(5, 7)) - 1) / 3);
}

// Compara dias "YYYY-MM-DD": o da venda segue a mesma regra da data exibida (formatDateInput).
export function isWithinPeriod(date, period) {
  if (!period || !date) return true;
  const day = formatDateInput(date.toISOString());
  const today = businessToday();
  if (period === 'today') {
    return day === today;
  }
  if (period === 'month') {
    return day.slice(0, 7) === today.slice(0, 7);
  }
  if (period === 'year') {
    return day.slice(0, 4) === today.slice(0, 4);
  }
  if (period === 'quarter') {
    return day.slice(0, 4) === today.slice(0, 4) && quarterOf(day) === quarterOf(today);
  }
  const days = Number(period);
  if (!Number.isFinite(days) || days <= 0) return true;
  const start = new Date(`${today}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return day >= start.toISOString().slice(0, 10) && day <= today;
}
