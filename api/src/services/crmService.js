const crm = require("../db/repositories/crm");

const DAY = 86400000;
const DEFAULT_REBUY_DAYS = 30; // cliente com uma compra so: volta em ~30 dias
const INACTIVE_FACTOR = 3; // passou de 3x o intervalo habitual = inativo

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// DDD + numero (10/11 digitos) vira 55 + numero; ja com 55 (12/13) segue; resto = sem WhatsApp.
function whatsappPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return /^55\d{10,11}$/.test(d) ? d : null;
}

function classify(c, now = Date.now()) {
  const base = { id: c.id, name: c.name, phone: c.phone, email: c.email, purchases: c.purchases, spent: c.spent, lastContactAt: c.lastContactAt, whatsappPhone: whatsappPhone(c.phone) };
  if (!c.purchases || !c.lastPurchaseAt) return { ...base, status: "sem_compras", lastPurchaseAt: null, daysSinceLast: null, avgIntervalDays: null, expectedAt: null, ticketAvg: null };
  const last = new Date(c.lastPurchaseAt).getTime();
  const daysSinceLast = Math.floor((now - last) / DAY);
  const avgInterval = c.purchases >= 2 ? Math.max(1, (last - new Date(c.firstPurchaseAt).getTime()) / DAY / (c.purchases - 1)) : null;
  const expected = avgInterval || DEFAULT_REBUY_DAYS;
  const ratio = daysSinceLast / expected;
  const status = ratio < 1 ? "em_dia" : ratio <= INACTIVE_FACTOR ? "recompra" : "inativo";
  return {
    ...base,
    status,
    lastPurchaseAt: c.lastPurchaseAt,
    daysSinceLast,
    avgIntervalDays: avgInterval == null ? null : Math.round(avgInterval * 10) / 10,
    expectedAt: new Date(last + expected * DAY).toISOString(),
    ticketAvg: Math.round((c.spent / c.purchases) * 100) / 100,
    overdueRatio: Math.round(ratio * 100) / 100,
  };
}

const ORDER = { recompra: 0, inativo: 1, em_dia: 2, sem_compras: 3 };

async function list(user, { status } = {}) {
  const rows = (await crm.customerStats(user.id)).map((c) => classify(c));
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  const allowed = ["recompra", "inativo", "em_dia", "sem_compras"];
  if (status && !allowed.includes(status)) throw fail(422, "Filtro inválido");
  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  filtered.sort((a, b) => ORDER[a.status] - ORDER[b.status] || (b.overdueRatio || 0) - (a.overdueRatio || 0) || a.name.localeCompare(b.name));
  return { customers: filtered, counts };
}

async function detail(user, id) {
  if (!(await crm.customerExists(user.id, id))) throw fail(404, "Cliente não encontrado");
  const [stats] = await crm.customerStats(user.id, id);
  const [sales, products, interactions] = await Promise.all([
    crm.recentSales(user.id, id),
    crm.topProducts(user.id, id),
    crm.listInteractions(user.id, id),
  ]);
  return { customer: classify(stats), sales, topProducts: products, interactions };
}

async function addInteraction(user, id, data) {
  if (!(await crm.customerExists(user.id, id))) throw fail(404, "Cliente não encontrado");
  const kind = String(data.kind || "NOTE").toUpperCase();
  if (!["NOTE", "WHATSAPP"].includes(kind)) throw fail(422, "Tipo inválido (NOTE ou WHATSAPP)");
  const note = typeof data.note === "string" ? data.note.trim().slice(0, 1000) : "";
  if (kind === "NOTE" && !note) throw fail(422, "Escreva a anotação");
  return { interaction: await crm.addInteraction(user.id, id, kind, note, user.userId || user.id) };
}

module.exports = { list, detail, addInteraction, whatsappPhone, classify };
