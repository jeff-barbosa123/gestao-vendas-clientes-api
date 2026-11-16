/**
 * Período selecionado: intervalo de datas e período anterior.
 */
export function buildPeriodQuery(value) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  let end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  if (value === 'quarter') {
    const quarter = Math.floor(now.getUTCMonth() / 3);
    const startMonth = quarter * 3;
    start.setUTCMonth(startMonth);
    start.setUTCDate(1);
    end = new Date(Date.UTC(now.getUTCFullYear(), startMonth + 3, 0));
  } else if (value === 'year') {
    start.setUTCMonth(0);
    start.setUTCDate(1);
    end = new Date(Date.UTC(now.getUTCFullYear(), 12, 0));
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

export function computePreviousPeriod(period) {
  const startDate = formatIso(period.start);
  const endDate = formatIso(period.end);
  if (!startDate || !endDate) return null;
  const diffMs = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - diffMs);
  return {
    start: previousStart.toISOString().slice(0, 10),
    end: previousEnd.toISOString().slice(0, 10),
  };
}
