const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_WEEK_RE = /^(\d{4})-W(\d{2})$/;
const ISO_MONTH_RE = /^(\d{4})-(\d{2})$/;
const ISO_YEAR_RE = /^\d{4}$/;

function buildError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseIsoDate(value, fieldName = 'date') {
  if (!value || typeof value !== 'string' || !ISO_DATE_RE.test(value)) {
    throw buildError(`${fieldName} deve estar no formato YYYY-MM-DD`);
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw buildError(`${fieldName} invalida`);
  }
  return date;
}

function parseIsoWeek(value) {
  const match = value && value.match(ISO_WEEK_RE);
  if (!match) throw buildError('week deve estar no formato YYYY-Www');
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) throw buildError('week invalida');

  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() + (dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { startDate: monday, endDate: sunday };
}

function parseIsoMonth(value) {
  const match = value && value.match(ISO_MONTH_RE);
  if (!match) throw buildError('month deve estar no formato YYYY-MM');
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw buildError('month invalido');
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));
  return { startDate, endDate };
}

function parseIsoYear(value) {
  const match = value && value.match(ISO_YEAR_RE);
  if (!match) throw buildError('year deve estar no formato YYYY');
  const year = Number(match[0]);
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year, 11, 31));
  return { startDate, endDate };
}

function ensureSingleTemporalFilter(filters) {
  const keys = ['day', 'week', 'month', 'year'];
  const used = keys.filter(k => filters[k]).length;
  if (used > 1 || ((filters.day || filters.week || filters.month || filters.year) && (filters.start || filters.end))) {
    throw buildError('Apenas um filtro temporal por requisicao (dia/semana/mes/ano ou start/end)');
  }
}

function validateDateRange({ start, end, maxDays = 366 }) {
  if (!start && !end) return {};
  if (!start || !end) throw buildError('start e end devem ser enviados juntos');
  const startDate = parseIsoDate(start, 'start');
  const endDate = parseIsoDate(end, 'end');
  if (startDate > endDate) throw buildError('start deve ser menor ou igual a end');
  const diffDays = (endDate - startDate) / MS_PER_DAY;
  if (diffDays > maxDays) throw buildError('Intervalo de datas muito longo');
  return { startDate, endDate };
}

function resolveTemporalRange(filters = {}, maxDays = 366) {
  ensureSingleTemporalFilter(filters);

  if (filters.day) {
    const date = parseIsoDate(filters.day, 'day');
    return { startDate: date, endDate: date };
  }
  if (filters.week) return parseIsoWeek(filters.week);
  if (filters.month) return parseIsoMonth(filters.month);
  if (filters.year) return parseIsoYear(filters.year);
  return validateDateRange({ start: filters.start, end: filters.end, maxDays });
}

function validateBreakdown(breakdown) {
  if (!breakdown) return 'day';
  const allowed = ['day', 'week', 'month', 'year', 'total'];
  if (!allowed.includes(breakdown)) {
    throw buildError('Parametro breakdown invalido');
  }
  return breakdown;
}

function toIsoDay(date) {
  return date.toISOString().slice(0, 10);
}

function toWeekKeyUTC(date) {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((temp - yearStart) / MS_PER_DAY) + 1) / 7);
  return `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function toMonthKeyUTC(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

module.exports = {
  buildError,
  parseIsoDate,
  resolveTemporalRange,
  validateDateRange,
  validateBreakdown,
  toIsoDay,
  toWeekKeyUTC,
  toMonthKeyUTC,
};
