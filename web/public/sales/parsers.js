/**
 * Parsing de valores e datas, status e filtros de período.
 */
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

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isWithinPeriod(date, period) {
  if (!period || !date) return true;
  const now = new Date();
  if (period === 'today') {
    return isSameDay(date, now);
  }
  if (period === 'month') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }
  if (period === 'year') {
    return date.getFullYear() === now.getFullYear();
  }
  if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    const startMonth = quarter * 3;
    return date.getFullYear() === now.getFullYear() && date.getMonth() >= startMonth && date.getMonth() <= startMonth + 2;
  }
  const days = Number(period);
  if (!Number.isFinite(days) || days <= 0) return true;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}
