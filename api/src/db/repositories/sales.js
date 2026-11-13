const { v4: uuidv4 } = require("uuid");
const { query } = require("../index");
const { runInTx, isUuid, toNumber } = require("./shared");

// Venda + nome do cliente cadastrado (a coluna customer_name só guarda o nome avulso)
const SALE_SELECT = "SELECT s.*, c.name AS registered_customer_name FROM sales s LEFT JOIN customers c ON c.id = s.customer_id";

function normalizeSale(row) {
  if (!row) return row;
  const { registered_customer_name: registeredName, ...rest } = row;
  return {
    ...rest,
    customer_name: rest.customer_name || registeredName || null,
    total: toNumber(row.total),
    cmv: toNumber(row.cmv),
  };
}

// Anexa os itens de cada venda
async function attachSaleItems(sales) {
  if (sales.length === 0) return [];
  const ids = sales.map((row) => row.id);
  const items = await query("SELECT * FROM sale_items WHERE sale_id = ANY($1)", [ids]);
  const itemsBySale = new Map();
  items.rows.forEach((row) => {
    const list = itemsBySale.get(row.sale_id) || [];
    list.push(row);
    itemsBySale.set(row.sale_id, list);
  });
  
  return sales.map((sale) => ({
    ...sale,
    items: (itemsBySale.get(sale.id) || []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      cmv: row.cmv == null ? null : Number(row.cmv),
    })),
  }));
}

async function listSales(ownerId, pagination = null) {
  const hasPagination = pagination && typeof pagination.limit === 'number' && typeof pagination.offset === 'number';
  
  // Query para contar total
  const countSql = ownerId
    ? "SELECT COUNT(*) AS total FROM sales WHERE owner_id = $1"
    : "SELECT COUNT(*) AS total FROM sales";
  const countParams = ownerId ? [ownerId] : [];
  const countResult = await query(countSql, countParams);
  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  // Query principal com paginação
  const sql = ownerId
    ? `${SALE_SELECT} WHERE s.owner_id = $1 ORDER BY s.date DESC, s.id DESC ${hasPagination ? 'LIMIT $2 OFFSET $3' : ''}`
    : `${SALE_SELECT} ORDER BY s.date DESC, s.id DESC ${hasPagination ? 'LIMIT $1 OFFSET $2' : ''}`;
  
  const params = ownerId
    ? (hasPagination ? [ownerId, pagination.limit, pagination.offset] : [ownerId])
    : (hasPagination ? [pagination.limit, pagination.offset] : []);
    
  const result = await query(sql, params);
  const sales = result.rows.map(normalizeSale);
  
  if (sales.length === 0) {
    return hasPagination ? { rows: [], total } : [];
  }
  
  const salesWithItems = await attachSaleItems(sales);
  
  if (hasPagination) {
    return {
      rows: salesWithItems,
      total,
    };
  }
  
  return salesWithItems;
}

async function getSaleById(id) {
  // Busca direta por id (antes carregava todas as vendas de todos os usuários)
  if (!isUuid(id)) return null;
  const result = await query(`${SALE_SELECT} WHERE s.id = $1`, [id]);
  const [sale] = await attachSaleItems(result.rows.map(normalizeSale));
  return sale || null;
}

async function createSale(sale, items, externalClient = null) {
  return runInTx(externalClient, async (client) => {
    await client.query(
      `INSERT INTO sales
        (id, customer_id, customer_name, owner_id, total, cmv, date, status, status_venda, canceled_at, payment_method, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [
        sale.id,
        sale.customerId,
        sale.customerName,
        sale.ownerId,
        sale.total,
        sale.cmv,
        sale.date,
        sale.status,
        sale.statusVenda,
        sale.canceledAt,
        sale.paymentMethod ?? null,
      ]
    );

    for (const item of items || []) {
      await client.query(
        `INSERT INTO sale_items
          (id, sale_id, product_id, quantity, unit_price, cmv)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          item.id || uuidv4(),
          sale.id,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.cmv,
        ]
      );
    }

    const created = await client.query("SELECT * FROM sales WHERE id = $1", [sale.id]);
    return normalizeSale(created.rows[0]);
  });
}

async function updateSale(id, sale, items, externalClient = null) {
  return runInTx(externalClient, async (client) => {
    await client.query(
      `UPDATE sales
         SET customer_id = COALESCE($2, customer_id),
             customer_name = COALESCE($3, customer_name),
             owner_id = COALESCE($4, owner_id),
             total = COALESCE($5, total),
             cmv = COALESCE($6, cmv),
             date = COALESCE($7, date),
             status = COALESCE($8, status),
             status_venda = COALESCE($9, status_venda),
             canceled_at = COALESCE($10, canceled_at),
             payment_method = COALESCE($11, payment_method)
       WHERE id = $1`,
      [
        id,
        sale.customerId,
        sale.customerName,
        sale.ownerId,
        sale.total,
        sale.cmv,
        sale.date,
        sale.status,
        sale.statusVenda,
        sale.canceledAt,
        sale.paymentMethod ?? null,
      ]
    );

    if (Array.isArray(items)) {
      await client.query("DELETE FROM sale_items WHERE sale_id = $1", [id]);
      for (const item of items) {
        await client.query(
          `INSERT INTO sale_items
            (id, sale_id, product_id, quantity, unit_price, cmv)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            item.id || uuidv4(),
            id,
            item.productId,
            item.quantity,
            item.unitPrice,
            item.cmv,
          ]
        );
      }
    }

    const updated = await client.query("SELECT * FROM sales WHERE id = $1", [id]);
    return normalizeSale(updated.rows[0]);
  });
}

// Histórico de auditoria da venda (persistido: sobrevive a reinício da API)
async function addSaleAudit(saleId, action, userId) {
  await query(
    `INSERT INTO sale_audit (sale_id, action, performed_by) VALUES ($1, $2, $3)`,
    [saleId, action, isUuid(userId) ? userId : null]
  );
}

async function listSaleAudit(saleId) {
  if (!isUuid(saleId)) return [];
  const result = await query(
    `SELECT action, performed_by, performed_at FROM sale_audit WHERE sale_id = $1 ORDER BY id`,
    [saleId]
  );
  return result.rows.map((r) => ({
    action: r.action,
    performedBy: r.performed_by || null,
    performedAt: new Date(r.performed_at).toISOString(),
  }));
}

// Registra o que a venda realmente baixou de cada produto (para devolver ao cancelar/editar)
async function saveSaleProductStock(saleId, entries, client) {
  const run = client ? client.query.bind(client) : query;
  for (const [productId, quantity] of entries) {
    await run(
      `INSERT INTO sale_product_stock (sale_id, product_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (sale_id, product_id) DO UPDATE SET quantity = sale_product_stock.quantity + EXCLUDED.quantity`,
      [saleId, productId, quantity]
    );
  }
}

// Devolve ao estoque tudo o que a venda baixou e apaga o registro (idempotente: 2ª chamada não devolve nada)
async function releaseSaleProductStock(saleId, client) {
  if (!isUuid(saleId)) return;
  const run = client ? client.query.bind(client) : query;
  const rows = await run(
    `DELETE FROM sale_product_stock WHERE sale_id = $1 RETURNING product_id, quantity`,
    [saleId]
  );
  const ordered = [...rows.rows].sort((a, b) => String(a.product_id).localeCompare(String(b.product_id)));
  for (const r of ordered) {
    await run(
      `UPDATE products SET stock = stock + $2, updated_at = NOW() WHERE id = $1 AND stock IS NOT NULL`,
      [r.product_id, r.quantity]
    );
  }
}

module.exports = {
  SALE_SELECT,
  normalizeSale,
  attachSaleItems,
  listSales,
  getSaleById,
  createSale,
  updateSale,
  addSaleAudit,
  listSaleAudit,
  saveSaleProductStock,
  releaseSaleProductStock,
};
