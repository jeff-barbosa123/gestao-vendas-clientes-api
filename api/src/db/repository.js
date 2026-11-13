const { v4: uuidv4 } = require("uuid");
const { query } = require("./index");
const { runInTx, isUuid, toNumber } = require("./repositories/shared");
const { getUserByEmail, getUserById, createUser, setEmailVerificationToken, verifyEmailByTokenHash, updateUserLogin, updateUserPassword, updateUserProfile, createPasswordReset, getPasswordResetByTokenHash, markPasswordResetUsed } = require("./repositories/users");
const { listCustomers, getCustomerById, customerEmailExists, customerCpfExists, customerCnpjExists, createCustomer, updateCustomer, deleteCustomer } = require("./repositories/customers");
const { listProducts, getProductById, createProduct, updateProduct, deleteProduct, adjustProductStock } = require("./repositories/products");
const { listRecipes, getRecipeById, createRecipe, updateRecipe, softDeleteRecipe } = require("./repositories/recipes");

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

// ===================== Insumos (cadastro único de ingredientes) =====================
// Unidade em que o estoque é guardado: kg/g -> g, l/ml -> ml, un -> un
function baseUnitOf(unit) {
  const u = String(unit || "").toLowerCase();
  if (u === "kg" || u === "g") return "g";
  if (u === "l" || u === "ml") return "ml";
  return "un";
}

function normalizeIngredientRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    packageQuantity: Number(row.package_quantity),
    packageUnit: row.package_unit,
    packageCost: Number(row.package_cost),
    usedInRecipes: row.used_in_recipes == null ? undefined : Number(row.used_in_recipes),
    stockQuantity: row.stock_quantity == null ? null : Number(row.stock_quantity),
    minStock: row.min_stock == null ? null : Number(row.min_stock),
    stockUnit: baseUnitOf(row.package_unit),
    lowStock:
      row.stock_quantity != null && row.min_stock != null && Number(row.stock_quantity) <= Number(row.min_stock),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listIngredients(ownerId) {
  const result = await query(
    `SELECT i.*,
            (SELECT COUNT(DISTINCT ri.recipe_id) FROM recipe_ingredients ri
              JOIN recipes r ON r.id = ri.recipe_id AND r.status <> 'INACTIVE'
             WHERE ri.ingredient_id = i.id) AS used_in_recipes
       FROM ingredients i
      WHERE ($1::uuid IS NULL OR i.owner_id = $1)
      ORDER BY lower(i.name)`,
    [ownerId || null]
  );
  return result.rows.map(normalizeIngredientRow);
}

async function getIngredientById(id) {
  if (!isUuid(id)) return null;
  const result = await query("SELECT * FROM ingredients WHERE id = $1", [id]);
  return normalizeIngredientRow(result.rows[0]);
}

async function ingredientNameExists(ownerId, name, excludeId) {
  const result = await query(
    `SELECT 1 FROM ingredients
      WHERE ($1::uuid IS NULL OR owner_id = $1) AND lower(name) = lower($2)
        AND ($3::uuid IS NULL OR id <> $3)
      LIMIT 1`,
    [ownerId || null, name, excludeId || null]
  );
  return result.rows.length > 0;
}

async function createIngredient(data) {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO ingredients (id, owner_id, name, package_quantity, package_unit, package_cost, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
    [id, data.ownerId || null, data.name, data.packageQuantity, data.packageUnit, data.packageCost]
  );
  await query(
    `INSERT INTO ingredient_price_history (id, ingredient_id, package_quantity, package_unit, package_cost)
     VALUES ($1,$2,$3,$4,$5)`,
    [uuidv4(), id, data.packageQuantity, data.packageUnit, data.packageCost]
  );
  return normalizeIngredientRow(result.rows[0]);
}

async function updateIngredient(id, data) {
  const result = await query(
    `UPDATE ingredients
        SET name = $2, package_quantity = $3, package_unit = $4, package_cost = $5, updated_at = NOW()
      WHERE id = $1 RETURNING *`,
    [id, data.name, data.packageQuantity, data.packageUnit, data.packageCost]
  );
  return normalizeIngredientRow(result.rows[0]);
}

async function addIngredientPriceHistory(ingredient) {
  await query(
    `INSERT INTO ingredient_price_history (id, ingredient_id, package_quantity, package_unit, package_cost)
     VALUES ($1,$2,$3,$4,$5)`,
    [uuidv4(), ingredient.id, ingredient.packageQuantity, ingredient.packageUnit, ingredient.packageCost]
  );
}

async function listIngredientPriceHistory(ingredientId, limit = 20) {
  const result = await query(
    `SELECT package_quantity, package_unit, package_cost, changed_at
       FROM ingredient_price_history WHERE ingredient_id = $1
      ORDER BY changed_at DESC LIMIT $2`,
    [ingredientId, limit]
  );
  return result.rows.map((r) => ({
    packageQuantity: Number(r.package_quantity),
    packageUnit: r.package_unit,
    packageCost: Number(r.package_cost),
    changedAt: r.changed_at,
  }));
}

async function deleteIngredient(id) {
  await query("DELETE FROM ingredients WHERE id = $1", [id]);
}

// ----- Estoque de insumos -----
function normalizeMovementRow(r) {
  return {
    id: r.id,
    ingredientId: r.ingredient_id,
    type: r.type,
    quantity: Number(r.quantity),
    balanceAfter: r.balance_after == null ? null : Number(r.balance_after),
    unitCost: r.unit_cost == null ? null : Number(r.unit_cost),
    saleId: r.sale_id,
    note: r.note,
    createdAt: r.created_at,
  };
}

// Itens das fichas (com insumo ligado) que entram em cada produto vendido
async function getRecipeConsumptionRows(recipeIds) {
  const ids = (recipeIds || []).filter(isUuid);
  if (!ids.length) return [];
  const result = await query(
    `SELECT r.id AS recipe_id, r.yield_qty, ri.ingredient_id, ri.quantity, ri.unit
       FROM recipes r
       JOIN recipe_ingredients ri ON ri.recipe_id = r.id
      WHERE r.id = ANY($1) AND ri.ingredient_id IS NOT NULL`,
    [ids]
  );
  return result.rows.map((row) => ({
    recipeId: row.recipe_id,
    yieldQty: Number(row.yield_qty) || 1,
    ingredientId: row.ingredient_id,
    quantity: Number(row.quantity),
    unit: row.unit,
  }));
}

/**
 * Soma `delta` ao estoque e registra a movimentação, numa transação.
 * onlyTracked = true: não mexe em insumo sem controle de estoque (stock_quantity NULL).
 * Retorna o insumo atualizado, ou null se não foi movimentado.
 */
async function moveIngredientStock(
  ingredientId,
  delta,
  movement = {},
  { onlyTracked = false, client: externalClient = null } = {}
) {
  if (!isUuid(ingredientId)) return null;
  return runInTx(externalClient, async (client) => {
    const updated = await client.query(
      `UPDATE ingredients
          SET stock_quantity = COALESCE(stock_quantity, 0) + $2, updated_at = NOW()
        WHERE id = $1 ${onlyTracked ? "AND stock_quantity IS NOT NULL" : ""}
        RETURNING *`,
      [ingredientId, delta]
    );
    const row = updated.rows[0];
    if (!row) return null;
    await client.query(
      `INSERT INTO ingredient_stock_movements
         (id, owner_id, ingredient_id, type, quantity, balance_after, unit_cost, sale_id, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        uuidv4(),
        movement.ownerId || row.owner_id || null,
        ingredientId,
        movement.type,
        delta,
        row.stock_quantity,
        movement.unitCost ?? null,
        movement.saleId || null,
        movement.note || null,
      ]
    );
    return normalizeIngredientRow(row);
  });
}

// Fichas ligadas pelo lado da ficha (recipes.link_product_id) aos produtos informados
async function getRecipeIdsByLinkedProducts(productIds) {
  const ids = (productIds || []).filter(isUuid);
  if (!ids.length) return new Map();
  const result = await query(
    `SELECT id, link_product_id FROM recipes
      WHERE link_product_id = ANY($1) AND status <> 'INACTIVE'`,
    [ids]
  );
  const map = new Map();
  result.rows.forEach((r) => { if (!map.has(r.link_product_id)) map.set(r.link_product_id, r.id); });
  return map;
}

async function setIngredientMinStock(ingredientId, minStock) {
  const result = await query(
    "UPDATE ingredients SET min_stock = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
    [ingredientId, minStock]
  );
  return normalizeIngredientRow(result.rows[0]);
}

async function disableIngredientStock(ingredientId) {
  const result = await query(
    "UPDATE ingredients SET stock_quantity = NULL, min_stock = NULL, updated_at = NOW() WHERE id = $1 RETURNING *",
    [ingredientId]
  );
  return normalizeIngredientRow(result.rows[0]);
}

async function listStockMovements(ingredientId, limit = 30) {
  const result = await query(
    `SELECT * FROM ingredient_stock_movements WHERE ingredient_id = $1
      ORDER BY created_at DESC, id LIMIT $2`,
    [ingredientId, limit]
  );
  return result.rows.map(normalizeMovementRow);
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

// Saldo líquido que uma venda ainda tem em cada insumo (SALE negativo + SALE_CANCEL positivo)
async function getSaleStockBalance(saleId, client = null) {
  if (!isUuid(saleId)) return [];
  const run = client ? client.query.bind(client) : query;
  const result = await run(
    `SELECT ingredient_id, SUM(quantity) AS net
       FROM ingredient_stock_movements
      WHERE sale_id = $1 AND type IN ('SALE', 'SALE_CANCEL')
      GROUP BY ingredient_id`,
    [saleId]
  );
  return result.rows
    .map((r) => ({ ingredientId: r.ingredient_id, net: Number(r.net) }))
    .filter((r) => Math.abs(r.net) > 0.0005);
}

async function listLowStockIngredients(ownerId) {
  const result = await query(
    `SELECT * FROM ingredients
      WHERE ($1::uuid IS NULL OR owner_id = $1)
        AND stock_quantity IS NOT NULL AND min_stock IS NOT NULL
        AND stock_quantity <= min_stock
      ORDER BY (stock_quantity - min_stock), lower(name)`,
    [ownerId || null]
  );
  return result.rows.map(normalizeIngredientRow);
}

async function listRecipeIdsByIngredient(ingredientId) {
  const result = await query(
    `SELECT DISTINCT ri.recipe_id FROM recipe_ingredients ri
       JOIN recipes r ON r.id = ri.recipe_id AND r.status <> 'INACTIVE'
      WHERE ri.ingredient_id = $1`,
    [ingredientId]
  );
  return result.rows.map((r) => r.recipe_id);
}

module.exports = {
  listIngredients,
  getIngredientById,
  ingredientNameExists,
  createIngredient,
  updateIngredient,
  addIngredientPriceHistory,
  listIngredientPriceHistory,
  deleteIngredient,
  listRecipeIdsByIngredient,
  baseUnitOf,
  getRecipeConsumptionRows,
  getRecipeIdsByLinkedProducts,
  moveIngredientStock,
  setIngredientMinStock,
  disableIngredientStock,
  listStockMovements,
  getSaleStockBalance,
  adjustProductStock,
  saveSaleProductStock,
  releaseSaleProductStock,
  addSaleAudit,
  listSaleAudit,
  listLowStockIngredients,
  getUserByEmail,
  getUserById,
  createUser,
  setEmailVerificationToken,
  verifyEmailByTokenHash,
  updateUserLogin,
  updateUserPassword,
  updateUserProfile,
  createPasswordReset,
  getPasswordResetByTokenHash,
  markPasswordResetUsed,
  listCustomers,
  getCustomerById,
  customerEmailExists,
  customerCpfExists,
  customerCnpjExists,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  softDeleteRecipe,
  listSales,
  getSaleById,
  createSale,
  updateSale,
};
