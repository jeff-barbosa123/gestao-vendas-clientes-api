const { randomUUID: uuidv4 } = require("crypto");
const { query, withTransaction } = require("../index");
const { isUuid } = require("./shared");
const { saleDaySql, saleFromSql, saleToSql } = require("../../utils/businessDate");

const num = (v) => (v == null ? null : Number(v));

const SELECT = `SELECT e.id, e.kind, e.description, e.amount, to_char(e.due_date,'YYYY-MM-DD') AS due_date, e.status,
    to_char(e.paid_at,'YYYY-MM-DD') AS paid_at, e.paid_amount, e.method, e.category, e.supplier, e.customer_id,
    c.name AS customer_name, e.notes, e.installment_no, e.installment_total, e.group_id,
    (e.status = 'OPEN' AND e.due_date < CURRENT_DATE) AS overdue
  FROM financial_entries e LEFT JOIN customers c ON c.id = e.customer_id`;

function map(r) {
  if (!r) return null;
  return {
    id: r.id,
    kind: r.kind,
    description: r.description,
    amount: num(r.amount),
    dueDate: r.due_date,
    status: r.status,
    overdue: Boolean(r.overdue),
    paidAt: r.paid_at,
    paidAmount: num(r.paid_amount),
    method: r.method,
    category: r.category,
    supplier: r.supplier,
    customerId: r.customer_id,
    customerName: r.customer_name,
    notes: r.notes,
    installmentNo: r.installment_no,
    installmentTotal: r.installment_total,
  };
}

async function listEntries(ownerId, { kind, status, from, to, limit = 500 }) {
  const where = ["e.owner_id = $1"];
  const params = [ownerId];
  const add = (sql, v) => { params.push(v); where.push(sql.replace("?", `$${params.length}`)); };
  if (kind) add("e.kind = ?", kind);
  if (status === "OVERDUE") where.push("e.status = 'OPEN' AND e.due_date < CURRENT_DATE");
  else if (status) add("e.status = ?", status);
  if (from) add("e.due_date >= ?::date", from);
  if (to) add("e.due_date <= ?::date", to);
  params.push(limit);
  const res = await query(`${SELECT} WHERE ${where.join(" AND ")} ORDER BY e.due_date ASC, e.created_at ASC LIMIT $${params.length}`, params);
  return res.rows.map(map);
}

async function getEntry(ownerId, id, client = null) {
  if (!isUuid(id)) return null;
  const sql = `${SELECT} WHERE e.owner_id = $1 AND e.id = $2${client ? " FOR UPDATE OF e" : ""}`;
  const res = client ? await client.query(sql, [ownerId, id]) : await query(sql, [ownerId, id]);
  return map(res.rows[0]);
}

async function insertEntries(ownerId, rows, createdBy) {
  const ids = [];
  await withTransaction(async (client) => {
    for (const r of rows) {
      const id = uuidv4();
      ids.push(id);
      await client.query(
        `INSERT INTO financial_entries
           (id, owner_id, kind, description, amount, due_date, category, supplier, customer_id, notes, group_id, installment_no, installment_total, created_by)
         VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [id, ownerId, r.kind, r.description, r.amount, r.dueDate, r.category, r.supplier, r.customerId, r.notes, r.groupId, r.installmentNo, r.installmentTotal, createdBy]
      );
    }
  });
  return ids;
}

async function updateEntry(ownerId, id, f) {
  await query(
    `UPDATE financial_entries SET description = $3, amount = $4, due_date = $5::date, category = $6, supplier = $7,
            customer_id = $8, notes = $9, updated_at = NOW()
      WHERE owner_id = $1 AND id = $2 AND status = 'OPEN'`,
    [ownerId, id, f.description, f.amount, f.dueDate, f.category, f.supplier, f.customerId, f.notes]
  );
}

async function markPaid(ownerId, id, { paidAt, paidAmount, method }, client) {
  await client.query(
    `UPDATE financial_entries SET status = 'PAID', paid_at = COALESCE($3::date, CURRENT_DATE), paid_amount = $4, method = $5, updated_at = NOW()
      WHERE owner_id = $1 AND id = $2`,
    [ownerId, id, paidAt || null, paidAmount, method || null]
  );
}

async function setStatus(ownerId, id, status, client) {
  await client.query(
    `UPDATE financial_entries SET status = $3, paid_at = NULL, paid_amount = NULL, method = NULL, updated_at = NOW()
      WHERE owner_id = $1 AND id = $2`,
    [ownerId, id, status]
  );
}

async function customerExists(ownerId, id) {
  if (!isUuid(id)) return false;
  return (await query("SELECT 1 FROM customers WHERE owner_id = $1 AND id = $2", [ownerId, id])).rowCount > 0;
}

// Totais em aberto/atrasados por tipo e janelas de vencimento (7 e 30 dias).
async function summary(ownerId) {
  const res = await query(
    `SELECT kind,
            COALESCE(SUM(amount) FILTER (WHERE status = 'OPEN'), 0) AS open_total,
            COALESCE(SUM(amount) FILTER (WHERE status = 'OPEN' AND due_date < CURRENT_DATE), 0) AS overdue_total,
            COUNT(*) FILTER (WHERE status = 'OPEN' AND due_date < CURRENT_DATE) AS overdue_count,
            COALESCE(SUM(amount) FILTER (WHERE status = 'OPEN' AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + 7), 0) AS next7,
            COALESCE(SUM(amount) FILTER (WHERE status = 'OPEN' AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + 30), 0) AS next30
       FROM financial_entries WHERE owner_id = $1 GROUP BY kind`,
    [ownerId]
  );
  const out = {};
  for (const r of res.rows) {
    out[r.kind] = { open: Number(r.open_total), overdue: Number(r.overdue_total), overdueCount: Number(r.overdue_count), next7: Number(r.next7), next30: Number(r.next30) };
  }
  return out;
}

const keyOf = (group, col) => (group === "month" ? `to_char(${col},'YYYY-MM')` : `to_char(${col},'YYYY-MM-DD')`);

async function cashflowRows(ownerId, from, to, group) {
  const saleKey = keyOf(group, `${saleDaySql("s.date")}::timestamp`);
  const sales = await query(
    `SELECT ${saleKey} AS k, COALESCE(SUM(s.total),0) AS v FROM sales s
      WHERE s.owner_id = $1 AND s.status <> 'CANCELED' AND s.status_venda <> 'cancelada'
        AND ${saleFromSql("s.date", "$2")} AND ${saleToSql("s.date", "$3")} GROUP BY k`,
    [ownerId, from, to]
  );
  const paidKey = keyOf(group, "e.paid_at");
  const paid = await query(
    `SELECT ${paidKey} AS k, e.kind, COALESCE(SUM(e.paid_amount),0) AS v FROM financial_entries e
      WHERE e.owner_id = $1 AND e.status = 'PAID' AND e.paid_at >= $2::date AND e.paid_at <= $3::date GROUP BY k, e.kind`,
    [ownerId, from, to]
  );
  const dueKey = keyOf(group, "e.due_date");
  const open = await query(
    `SELECT ${dueKey} AS k, e.kind, COALESCE(SUM(e.amount),0) AS v FROM financial_entries e
      WHERE e.owner_id = $1 AND e.status = 'OPEN' AND e.due_date >= $2::date AND e.due_date <= $3::date GROUP BY k, e.kind`,
    [ownerId, from, to]
  );
  return { sales: sales.rows, paid: paid.rows, open: open.rows };
}

async function dreRows(ownerId, from, to) {
  const sales = await query(
    `SELECT COUNT(*) AS n, COALESCE(SUM(s.total),0) AS net, COALESCE(SUM(s.discount),0) AS discounts, COALESCE(SUM(s.cmv),0) AS cmv
       FROM sales s WHERE s.owner_id = $1 AND s.status <> 'CANCELED' AND s.status_venda <> 'cancelada'
        AND ${saleFromSql("s.date", "$2")} AND ${saleToSql("s.date", "$3")}`,
    [ownerId, from, to]
  );
  const paid = await query(
    `SELECT e.kind, COALESCE(NULLIF(TRIM(e.category),''),'Sem categoria') AS category, COALESCE(SUM(e.paid_amount),0) AS v
       FROM financial_entries e WHERE e.owner_id = $1 AND e.status = 'PAID' AND e.paid_at >= $2::date AND e.paid_at <= $3::date
      GROUP BY e.kind, category ORDER BY v DESC`,
    [ownerId, from, to]
  );
  return { sales: sales.rows[0], paid: paid.rows };
}

module.exports = { listEntries, getEntry, insertEntries, updateEntry, markPaid, setStatus, customerExists, summary, cashflowRows, dreRows };
