/**
 * Período selecionado: intervalo de datas e período anterior.
 */
// Fuso padrao da empresa (o mesmo de api/src/utils/businessDate.js); nao depende do fuso do navegador.
const BUSINESS_TIME_ZONE = 'America/Fortaleza';

function businessYearMonth(now) {
  const parts = {};
  new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit' })
    .formatToParts(now)
    .forEach((p) => { parts[p.type] = p.value; });
  return { year: Number(parts.year), month: Number(parts.month) - 1 };
}

export function buildPeriodQuery(value) {
  const { year, month } = businessYearMonth(new Date());
  const start = new Date(Date.UTC(year, month, 1));
  let end = new Date(Date.UTC(year, month + 1, 0));
  if (value === 'quarter') {
    const quarter = Math.floor(month / 3);
    const startMonth = quarter * 3;
    start.setUTCMonth(startMonth);
    start.setUTCDate(1);
    end = new Date(Date.UTC(year, startMonth + 3, 0));
  } else if (value === 'year') {
    start.setUTCMonth(0);
    start.setUTCDate(1);
    end = new Date(Date.UTC(year, 12, 0));
  }
  const fmt = (d) => d.toISOString().slice(0, 10);
  return {
    queryString: `?start=${fmt(start)}&end=${fmt(end)}`,
    start: fmt(start),
    end: fmt(end),
  };
}

function formatIso(date) {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function daysBetween(from, to) {
  const a = formatIso(from);
  const b = formatIso(to);
  if (!a || !b) return null;
  const diff = Math.abs(b.getTime() - a.getTime());
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

// Tamanho em meses de cada bloco do calendario aceito na comparacao.
const CALENDAR_UNITS = { 1: 'month', 3: 'quarter', 12: 'year' };

// Mes, trimestre ou ano anterior completo do calendario. Retorna null se o intervalo nao for um desses blocos.
export function computePreviousPeriod(period) {
  const startDate = formatIso(period.start);
  const endDate = formatIso(period.end);
  if (!startDate || !endDate) return null;
  const nextDay = new Date(endDate.getTime() + 864e5);
  if (startDate.getUTCDate() !== 1 || nextDay.getUTCDate() !== 1) return null;
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();
  const months = (nextDay.getUTCFullYear() - year) * 12 + nextDay.getUTCMonth() - month;
  const unit = CALENDAR_UNITS[months];
  // Trimestre comeca em jan, abr, jul ou out; ano comeca em janeiro.
  if (!unit || month % months !== 0) return null;
  const fmt = (d) => d.toISOString().slice(0, 10);
  return {
    start: fmt(new Date(Date.UTC(year, month - months, 1))),
    end: fmt(new Date(Date.UTC(year, month, 0))),
    unit,
  };
}
