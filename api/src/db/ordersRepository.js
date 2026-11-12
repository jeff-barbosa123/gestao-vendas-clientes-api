// Acesso a dados das encomendas (orders / order_items)
const { v4: uuidv4 } = require("uuid");
const { query, withTransaction } = require("./index");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === "string" && UUID_RE.test(v);

function normalizeItem(r) {
  return {
    id: r.id,
    productId: r.product_id,
    productName: r.product_name,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    total: Math.round(Number(r.quantity) * Number(r.unit_price) * 100) / 100,
  };
}

function normalizeOrder(row, items = []) {
  if (!row) return null;
  const total = Number(row.total);
  const deposit = Number(row.deposit);
  return {
    id: row.id,
    ownerId: row.owner_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    deliveryAt: row.delivery_at,
    status: row.status,
    deposit,
    depositMethod: row.deposit_method,
    total,
    balanceDue: Math.max(0, Math.round((total - deposit) * 100) / 100),
    notes: row.notes,
    saleId: row.sale_id,
    deliveredAt: row.delivered_at,
    canceledAt: row.canceled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

async function attachItems(rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const items = await query("SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY product_name", [ids]);
  const byOrder = new Map();
  items.rows.forEach((it) => {
    if (!byOrder.has(it.order_id)) byOrder.set(it.order_id, []);
    byOrder.get(it.order_id).push(normalizeItem(it));
  });
  return rows.map((r) => normalizeOrder(r, byOrder.get(r.id) || []));
}

async function listOrders(ownerId, { from, to, status } = {}) {
  const result = await query(
    `SELECT * FROM orders
      WHERE ($1::uuid IS NULL OR owner_id = $1)
        AND ($2::timestamptz IS NULL OR delivery_at >= $2)
        AND ($3::timestamptz IS NULL OR delivery_at < $3)
        AND ($4::text[] IS NULL OR status = ANY($4))
      ORDER BY delivery_at, created_at`,
    [ownerId || null, from || null, to || null, status && status.length ? status : null]
  );
  return attachItems(result.rows);
}

async function getOrderById(id) {
  if (!isUuid(id)) return null;
  const result = await query("SELECT * FROM orders WHERE id = $1", [id]);
  const [order] = await attachItems(result.rows);
  return order || null;
}

async function insertItems(client, orderId, items) {
  for (const it of items) {
    await client.query(
      `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuidv4(), orderId, it.productId, it.productName || null, it.quantity, it.unitPrice]
    );
  }
}

async function createOrder(order, items) {
  const id = uuidv4();
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO orders
         (id, owner_id, customer_id, customer_name, customer_phone, delivery_at, status,
          deposit, deposit_method, total, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'PENDING',$7,$8,$9,$10,NOW())`,
      [
        id,
        order.ownerId || null,
        order.customerId || null,
        order.customerName || null,
        order.customerPhone || null,
        order.deliveryAt,
        order.deposit || 0,
        order.depositMethod || null,
        order.total,
        order.notes || null,
      ]
    );
    await insertItems(client, id, items);
  });
  return getOrderById(id);
}

async function updateOrder(id, order, items) {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE orders
          SET customer_id = $2, customer_name = $3, customer_phone = $4, delivery_at = $5,
              deposit = $6, deposit_method = $7, total = $8, notes = $9, updated_at = NOW()
        WHERE id = $1`,
      [
        id,
        order.customerId || null,
        order.customerName || null,
        order.customerPhone || null,
        order.deliveryAt,
        order.deposit || 0,
        order.depositMethod || null,
        order.total,
        order.notes || null,
      ]
    );
    if (Array.isArray(items)) {
      await client.query("DELETE FROM order_items WHERE order_id = $1", [id]);
      await insertItems(client, id, items);
    }
  });
  return getOrderById(id);
}

async function setOrderStatus(id, status, extra = {}) {
  await query(
    `UPDATE orders
        SET status = $2,
            sale_id = COALESCE($3, sale_id),
            delivered_at = CASE WHEN $2 = 'DELIVERED' THEN NOW() ELSE delivered_at END,
            canceled_at = CASE WHEN $2 = 'CANCELED' THEN NOW() ELSE canceled_at END,
            updated_at = NOW()
      WHERE id = $1`,
    [id, status, extra.saleId || null]
  );
  return getOrderById(id);
}

module.exports = { listOrders, getOrderById, createOrder, updateOrder, setOrderStatus, isUuid };
