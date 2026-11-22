const { randomUUID: uuidv4 } = require("crypto");
const { query } = require("../index");
const { isUuid } = require("./shared");

const num = (v) => (v == null ? null : Number(v));

// Uma linha por cliente com compras (vendas nao canceladas) e ultimo contato por WhatsApp.
async function customerStats(ownerId, customerId = null) {
  const res = await query(
    `SELECT c.id, c.name, c.phone, c.email,
            COUNT(s.id) AS purchases,
            MAX(s.date) AS last_purchase_at,
            MIN(s.date) AS first_purchase_at,
            COALESCE(SUM(s.total), 0) AS spent,
            (SELECT MAX(i.created_at) FROM customer_interactions i
              WHERE i.customer_id = c.id AND i.owner_id = c.owner_id AND i.kind = 'WHATSAPP') AS last_contact_at
       FROM customers c
       LEFT JOIN sales s ON s.customer_id = c.id AND s.owner_id = c.owner_id
                        AND s.status <> 'CANCELED' AND s.status_venda <> 'cancelada'
      WHERE c.owner_id = $1 AND ($2::uuid IS NULL OR c.id = $2::uuid)
      GROUP BY c.id`,
    [ownerId, customerId]
  );
  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    purchases: Number(r.purchases),
    lastPurchaseAt: r.last_purchase_at,
    firstPurchaseAt: r.first_purchase_at,
    spent: Number(r.spent),
    lastContactAt: r.last_contact_at,
  }));
}

async function recentSales(ownerId, customerId, limit = 15) {
  const res = await query(
    `SELECT s.id, s.date, s.total, s.status,
            (SELECT COALESCE(SUM(quantity),0) FROM sale_items si WHERE si.sale_id = s.id) AS units
       FROM sales s
      WHERE s.owner_id = $1 AND s.customer_id = $2
      ORDER BY s.date DESC LIMIT $3`,
    [ownerId, customerId, limit]
  );
  return res.rows.map((r) => ({ id: r.id, date: r.date, total: num(r.total), status: r.status, units: Number(r.units) }));
}

async function topProducts(ownerId, customerId, limit = 5) {
  const res = await query(
    `SELECT p.id, p.name, SUM(si.quantity) AS units
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
      WHERE s.owner_id = $1 AND s.customer_id = $2 AND s.status <> 'CANCELED'
      GROUP BY p.id, p.name ORDER BY units DESC, p.name LIMIT $3`,
    [ownerId, customerId, limit]
  );
  return res.rows.map((r) => ({ productId: r.id, name: r.name, units: Number(r.units) }));
}

async function listInteractions(ownerId, customerId, limit = 20) {
  const res = await query(
    `SELECT i.id, i.kind, i.note, i.created_at, u.name AS author
       FROM customer_interactions i LEFT JOIN users u ON u.id = i.created_by
      WHERE i.owner_id = $1 AND i.customer_id = $2 ORDER BY i.created_at DESC LIMIT $3`,
    [ownerId, customerId, limit]
  );
  return res.rows.map((r) => ({ id: r.id, kind: r.kind, note: r.note, createdAt: r.created_at, author: r.author || null }));
}

async function addInteraction(ownerId, customerId, kind, note, createdBy) {
  const id = uuidv4();
  const res = await query(
    `INSERT INTO customer_interactions (id, owner_id, customer_id, kind, note, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, kind, note, created_at`,
    [id, ownerId, customerId, kind, note || null, createdBy]
  );
  const r = res.rows[0];
  return { id: r.id, kind: r.kind, note: r.note, createdAt: r.created_at };
}

async function customerExists(ownerId, customerId) {
  if (!isUuid(customerId)) return false;
  const res = await query("SELECT 1 FROM customers WHERE owner_id = $1 AND id = $2", [ownerId, customerId]);
  return res.rowCount > 0;
}

module.exports = { customerStats, recentSales, topProducts, listInteractions, addInteraction, customerExists };
