const { randomUUID: uuidv4 } = require("crypto");
const { query } = require("../index");
const { runInTx, isUuid } = require("./shared");

const num = (v) => (v == null ? null : Number(v));

function mapRegister(r) {
  if (!r) return null;
  return {
    id: r.id,
    operatorId: r.operator_id,
    status: r.status,
    openingAmount: num(r.opening_amount),
    openedAt: r.opened_at,
    note: r.note,
    closedAt: r.closed_at,
    countedAmount: num(r.counted_amount),
    expectedAmount: num(r.expected_amount),
    difference: num(r.difference),
    closeNote: r.close_note,
  };
}

async function getOpenRegister(ownerId, operatorId, client = null) {
  const sql = "SELECT * FROM cash_registers WHERE owner_id = $1 AND operator_id = $2 AND status = 'OPEN'";
  const res = client ? await client.query(sql, [ownerId, operatorId]) : await query(sql, [ownerId, operatorId]);
  return mapRegister(res.rows[0]);
}

async function getRegister(ownerId, id, { lock = false, client = null } = {}) {
  if (!isUuid(id)) return null;
  const sql = `SELECT * FROM cash_registers WHERE owner_id = $1 AND id = $2${lock ? " FOR UPDATE" : ""}`;
  const res = client ? await client.query(sql, [ownerId, id]) : await query(sql, [ownerId, id]);
  return mapRegister(res.rows[0]);
}

async function openRegister(ownerId, operatorId, openingAmount, note) {
  const id = uuidv4();
  const res = await query(
    `INSERT INTO cash_registers (id, owner_id, operator_id, opening_amount, note)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, ownerId, operatorId, openingAmount, note || null]
  );
  return mapRegister(res.rows[0]);
}

async function closeRegister(ownerId, id, closedBy, { counted, expected, difference, note }, client) {
  const res = await client.query(
    `UPDATE cash_registers
        SET status = 'CLOSED', closed_at = NOW(), closed_by = $3, counted_amount = $4,
            expected_amount = $5, difference = $6, close_note = $7
      WHERE owner_id = $1 AND id = $2 RETURNING *`,
    [ownerId, id, closedBy, counted, expected, difference, note || null]
  );
  return mapRegister(res.rows[0]);
}

async function addMovement(ownerId, registerId, { type, amount, reason }, createdBy, client) {
  const res = await runInTx(client, (c) =>
    c.query(
      `INSERT INTO cash_movements (id, owner_id, register_id, type, amount, reason, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [uuidv4(), ownerId, registerId, type, amount, reason || null, createdBy]
    )
  );
  const r = res.rows[0];
  return { id: r.id, type: r.type, amount: num(r.amount), reason: r.reason, createdAt: r.created_at };
}

async function listMovements(ownerId, registerId) {
  const res = await query(
    "SELECT * FROM cash_movements WHERE owner_id = $1 AND register_id = $2 ORDER BY created_at ASC",
    [ownerId, registerId]
  );
  return res.rows.map((r) => ({ id: r.id, type: r.type, amount: num(r.amount), reason: r.reason, createdAt: r.created_at }));
}

// Totais do caixa: vendas ativas (cmv incluso), pagamentos por forma e movimentos.
async function registerTotals(ownerId, registerId, client = null) {
  const run = (sql, params) => (client ? client.query(sql, params) : query(sql, params));
  const sales = await run(
    `SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS total, COALESCE(SUM(cmv),0) AS cmv
       FROM sales WHERE owner_id = $1 AND register_id = $2 AND status <> 'CANCELED'`,
    [ownerId, registerId]
  );
  const pays = await run(
    `SELECT p.method, COALESCE(SUM(p.amount),0) AS amount
       FROM sale_payments p JOIN sales s ON s.id = p.sale_id
      WHERE p.owner_id = $1 AND p.register_id = $2 AND s.status <> 'CANCELED'
      GROUP BY p.method ORDER BY p.method`,
    [ownerId, registerId]
  );
  const movs = await run(
    `SELECT type, COALESCE(SUM(amount),0) AS amount FROM cash_movements
      WHERE owner_id = $1 AND register_id = $2 GROUP BY type`,
    [ownerId, registerId]
  );
  const byMovement = Object.fromEntries(movs.rows.map((r) => [r.type, Number(r.amount)]));
  return {
    salesCount: Number(sales.rows[0].n),
    salesTotal: Number(sales.rows[0].total),
    cmv: Number(sales.rows[0].cmv),
    payments: pays.rows.map((r) => ({ method: r.method, amount: Number(r.amount) })),
    suprimento: byMovement.SUPRIMENTO || 0,
    sangria: byMovement.SANGRIA || 0,
  };
}

async function listRegisters(ownerId, operatorId, limit = 30) {
  const base = "SELECT r.*, u.name AS operator_name FROM cash_registers r LEFT JOIN users u ON u.id = r.operator_id WHERE r.owner_id = $1";
  const res = operatorId
    ? await query(base + " AND r.operator_id = $2 ORDER BY r.opened_at DESC LIMIT $3", [ownerId, operatorId, limit])
    : await query(base + " ORDER BY r.opened_at DESC LIMIT $2", [ownerId, limit]);
  return res.rows.map((r) => ({ ...mapRegister(r), operatorName: r.operator_name || null }));
}

async function insertPayments(ownerId, saleId, registerId, rows, client) {
  for (const p of rows) {
    await client.query(
      `INSERT INTO sale_payments (id, owner_id, sale_id, register_id, method, amount, received, change_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [uuidv4(), ownerId, saleId, registerId, p.method, p.amount, p.received ?? null, p.change ?? null]
    );
  }
  await client.query("UPDATE sales SET register_id = $1 WHERE id = $2 AND owner_id = $3", [registerId, saleId, ownerId]);
}

async function listSalePayments(ownerId, saleId) {
  const res = await query(
    "SELECT * FROM sale_payments WHERE owner_id = $1 AND sale_id = $2 ORDER BY created_at ASC, method",
    [ownerId, saleId]
  );
  return res.rows.map((r) => ({
    method: r.method,
    amount: num(r.amount),
    received: num(r.received),
    change: num(r.change_amount),
  }));
}

async function getDiscountLimit(ownerId) {
  const res = await query("SELECT pdv_discount_limit FROM company_modules WHERE owner_id = $1", [ownerId]);
  return res.rows[0] ? Number(res.rows[0].pdv_discount_limit) : 0;
}

async function setDiscountLimit(ownerId, pct) {
  await query(
    `INSERT INTO company_modules (owner_id, modules, pdv_discount_limit) VALUES ($1, '{}'::jsonb, $2)
     ON CONFLICT (owner_id) DO UPDATE SET pdv_discount_limit = EXCLUDED.pdv_discount_limit, updated_at = NOW()`,
    [ownerId, pct]
  );
}

async function searchProducts(ownerId, term) {
  const t = String(term || "").trim();
  const res = await query(
    `SELECT id, name, price, barcode, stock
       FROM products
      WHERE owner_id = $1 AND (status_produto IS NULL OR status_produto = 'ATIVO')
        AND ($2 = '' OR barcode = $2 OR name ILIKE $3)
      ORDER BY (barcode = $2) DESC NULLS LAST, name ASC LIMIT 24`,
    [ownerId, t, `%${t.replace(/[%_\\]/g, "\\$&")}%`]
  );
  return res.rows.map((r) => ({ id: r.id, name: r.name, price: num(r.price), barcode: r.barcode, stock: num(r.stock) }));
}

async function setProductBarcode(ownerId, productId, barcode) {
  if (!isUuid(productId)) return false;
  const res = await query("UPDATE products SET barcode = $3 WHERE owner_id = $1 AND id = $2", [ownerId, productId, barcode]);
  return res.rowCount > 0;
}

module.exports = {
  getOpenRegister,
  getRegister,
  openRegister,
  closeRegister,
  addMovement,
  listMovements,
  registerTotals,
  listRegisters,
  insertPayments,
  listSalePayments,
  searchProducts,
  setProductBarcode,
  getDiscountLimit,
  setDiscountLimit,
};
