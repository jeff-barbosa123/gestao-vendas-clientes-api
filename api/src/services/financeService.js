const { randomUUID: uuidv4 } = require("crypto");
const fin = require("../db/repositories/finance");
const { withTransaction } = require("../db");

function fail(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

const KINDS = ["PAYABLE", "RECEIVABLE"];
const STATUSES = ["OPEN", "PAID", "CANCELED", "OVERDUE"];
const METHODS = ["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "BOLETO", "TRANSFER", "OTHER"];
const cents = (v) => Math.round(Number(v) * 100);
const money = (c) => Number((c / 100).toFixed(2));
const text = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

function parseDate(value, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw fail(422, `${field} deve estar no formato AAAA-MM-DD`);
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw fail(422, `${field} inválida`);
  return value;
}

function parseAmount(value, field) {
  const n = Number(value);
  if (value === "" || value == null || !Number.isFinite(n) || n <= 0 || n > 99999999) throw fail(422, `${field} inválido`);
  return cents(n);
}

function addMonths(isoDate, n) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

async function fields(user, data) {
  const description = text(data.description, 160);
  if (!description) throw fail(422, "Descrição é obrigatória");
  let customerId = null;
  if (data.customerId) {
    if (!(await fin.customerExists(user.id, data.customerId))) throw fail(422, "Cliente não encontrado");
    customerId = data.customerId;
  }
  return {
    description,
    category: text(data.category, 60),
    supplier: text(data.supplier, 120),
    notes: text(data.notes, 500),
    customerId,
  };
}

async function create(user, data) {
  const kind = String(data.kind || "").toUpperCase();
  if (!KINDS.includes(kind)) throw fail(422, "Tipo inválido (PAYABLE ou RECEIVABLE)");
  const base = await fields(user, data);
  if (kind === "PAYABLE") base.customerId = null;
  const total = parseAmount(data.amount, "Valor");
  const firstDue = parseDate(data.dueDate, "Vencimento");
  const n = data.installments == null || data.installments === "" ? 1 : Number(data.installments);
  if (!Number.isInteger(n) || n < 1 || n > 24) throw fail(422, "Parcelas devem ser de 1 a 24");
  const each = Math.floor(total / n);
  const groupId = n > 1 ? uuidv4() : null;
  const rows = Array.from({ length: n }, (_v, i) => ({
    ...base,
    kind,
    // A diferenca de centavos fica na primeira parcela, para a soma bater com o total.
    amount: money(i === 0 ? total - each * (n - 1) : each),
    dueDate: addMonths(firstDue, i),
    groupId,
    installmentNo: n > 1 ? i + 1 : null,
    installmentTotal: n > 1 ? n : null,
  }));
  const ids = await fin.insertEntries(user.id, rows, user.userId || user.id);
  const entries = await Promise.all(ids.map((id) => fin.getEntry(user.id, id)));
  return { entries };
}

async function load(user, id) {
  const entry = await fin.getEntry(user.id, id);
  if (!entry) throw fail(404, "Lançamento não encontrado");
  return entry;
}

async function update(user, id, data) {
  const current = await load(user, id);
  if (current.status !== "OPEN") throw fail(409, "Só lançamentos em aberto podem ser editados.", "ENTRY_NOT_OPEN");
  const merged = { ...current, ...data };
  const base = await fields(user, merged);
  if (current.kind === "PAYABLE") base.customerId = null;
  await fin.updateEntry(user.id, id, {
    ...base,
    amount: money(parseAmount(merged.amount, "Valor")),
    dueDate: parseDate(merged.dueDate, "Vencimento"),
  });
  return { entry: await fin.getEntry(user.id, id) };
}

async function pay(user, id, data) {
  await load(user, id);
  const paidAt = data.paidAt ? parseDate(data.paidAt, "Data do pagamento") : null;
  const method = data.method ? String(data.method).toUpperCase() : null;
  if (method && !METHODS.includes(method)) throw fail(422, "Forma de pagamento inválida");
  await withTransaction(async (client) => {
    const entry = await fin.getEntry(user.id, id, client);
    if (entry.status !== "OPEN") throw fail(409, "Lançamento não está em aberto.", "ENTRY_NOT_OPEN");
    const paidAmount = data.paidAmount == null || data.paidAmount === "" ? entry.amount : money(parseAmount(data.paidAmount, "Valor pago"));
    await fin.markPaid(user.id, id, { paidAt, paidAmount, method }, client);
  });
  return { entry: await fin.getEntry(user.id, id) };
}

async function transition(user, id, from, to, message) {
  await load(user, id);
  await withTransaction(async (client) => {
    const entry = await fin.getEntry(user.id, id, client);
    if (!from.includes(entry.status)) throw fail(409, message, "ENTRY_BAD_STATE");
    await fin.setStatus(user.id, id, to, client);
  });
  return { entry: await fin.getEntry(user.id, id) };
}

const cancel = (user, id) => transition(user, id, ["OPEN"], "CANCELED", "Só lançamentos em aberto podem ser cancelados.");
const reopen = (user, id) => transition(user, id, ["PAID", "CANCELED"], "OPEN", "Só lançamentos pagos ou cancelados podem ser reabertos.");

async function list(user, q) {
  const kind = q.kind ? String(q.kind).toUpperCase() : null;
  if (kind && !KINDS.includes(kind)) throw fail(422, "Tipo inválido");
  const status = q.status ? String(q.status).toUpperCase() : null;
  if (status && !STATUSES.includes(status)) throw fail(422, "Situação inválida");
  const from = q.from ? parseDate(q.from, "from") : null;
  const to = q.to ? parseDate(q.to, "to") : null;
  return { entries: await fin.listEntries(user.id, { kind, status, from, to }) };
}

async function summary(user) {
  const s = await fin.summary(user.id);
  const zero = { open: 0, overdue: 0, overdueCount: 0, next7: 0, next30: 0 };
  const payable = s.PAYABLE || zero;
  const receivable = s.RECEIVABLE || zero;
  return { payable, receivable, openBalance: money(cents(receivable.open) - cents(payable.open)) };
}

const MAX_DAYS = 366;
function period(q) {
  const now = new Date();
  const from = q.from ? parseDate(q.from, "from") : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = q.to ? parseDate(q.to, "to") : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  if (to < from) throw fail(422, "O período final é anterior ao inicial");
  if ((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000 > MAX_DAYS) throw fail(422, "Período máximo de 366 dias");
  return { from, to };
}

async function cashflow(user, q) {
  const { from, to } = period(q);
  const group = q.group === "month" ? "month" : "day";
  const rows = await fin.cashflowRows(user.id, from, to, group);
  const map = new Map();
  const at = (k) => {
    if (!map.has(k)) map.set(k, { period: k, salesIn: 0, receivablesIn: 0, payablesOut: 0, projectedIn: 0, projectedOut: 0 });
    return map.get(k);
  };
  rows.sales.forEach((r) => { at(r.k).salesIn = Number(r.v); });
  rows.paid.forEach((r) => { at(r.k)[r.kind === "RECEIVABLE" ? "receivablesIn" : "payablesOut"] = Number(r.v); });
  rows.open.forEach((r) => { at(r.k)[r.kind === "RECEIVABLE" ? "projectedIn" : "projectedOut"] = Number(r.v); });
  let cumulative = 0;
  const periods = [...map.values()].sort((a, b) => a.period.localeCompare(b.period)).map((p) => {
    const net = money(cents(p.salesIn) + cents(p.receivablesIn) - cents(p.payablesOut));
    cumulative = money(cents(cumulative) + cents(net));
    return { ...p, net, cumulative };
  });
  const sum = (key) => money(periods.reduce((a, p) => a + cents(p[key]), 0));
  return {
    from,
    to,
    group,
    periods,
    totals: { salesIn: sum("salesIn"), receivablesIn: sum("receivablesIn"), payablesOut: sum("payablesOut"), net: sum("net"), projectedIn: sum("projectedIn"), projectedOut: sum("projectedOut") },
  };
}

async function dre(user, q) {
  const { from, to } = period(q);
  const { sales, paid } = await fin.dreRows(user.id, from, to);
  const net = cents(sales.net);
  const discounts = cents(sales.discounts);
  const cmv = cents(sales.cmv);
  const grossProfit = net - cmv;
  const otherIncome = paid.filter((r) => r.kind === "RECEIVABLE").reduce((a, r) => a + cents(r.v), 0);
  const expenses = paid.filter((r) => r.kind === "PAYABLE").map((r) => ({ category: r.category, amount: Number(r.v) }));
  const totalExpenses = expenses.reduce((a, e) => a + cents(e.amount), 0);
  const result = grossProfit + otherIncome - totalExpenses;
  const base = net + otherIncome;
  const pct = (v, d) => (d > 0 ? Math.round((v / d) * 10000) / 10000 : null);
  return {
    from,
    to,
    salesCount: Number(sales.n),
    grossRevenue: money(net + discounts),
    discounts: money(discounts),
    netRevenue: money(net),
    cmv: money(cmv),
    grossProfit: money(grossProfit),
    grossMargin: pct(grossProfit, net),
    otherIncome: money(otherIncome),
    expenses,
    totalExpenses: money(totalExpenses),
    operatingResult: money(result),
    resultMargin: pct(result, base),
  };
}

module.exports = { create, update, pay, cancel, reopen, list, summary, cashflow, dre };
