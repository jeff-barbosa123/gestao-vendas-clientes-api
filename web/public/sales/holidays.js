/**
 * Consulta de feriados para a data da venda.
 */
import { state } from './state.js';
import { apiRequest, setInlineMessage } from './core.js';

async function loadHolidays(year, token) {
  const key = String(year);
  const cached = state.holidaysCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.items;
  }
  const response = await apiRequest(`/api/holidays/${key}`, token);
  const items = Array.isArray(response) ? response : response.items || [];
  state.holidaysCache.set(key, { items, expiresAt: Date.now() + 1000 * 60 * 60 * 24 });
  return items;
}

export async function checkHoliday(dateValue, token, targetEl) {
  if (!targetEl) return;
  if (!dateValue) {
    setInlineMessage(targetEl, '');
    return;
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    setInlineMessage(targetEl, '');
    return;
  }
  try {
    const items = await loadHolidays(date.getFullYear(), token);
    const iso = date.toISOString().slice(0, 10);
    const match = (items || []).find((holiday) => holiday && String(holiday.date) === iso);
    if (match) {
      const name = String(match.name || match.nome || 'Feriado');
      setInlineMessage(targetEl, `Feriado nacional: ${name}.`, 'is-warning');
    } else {
      setInlineMessage(targetEl, '');
    }
  } catch (_err) {
    setInlineMessage(targetEl, '');
  }
}
