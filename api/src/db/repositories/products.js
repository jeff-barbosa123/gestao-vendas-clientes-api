const { v4: uuidv4 } = require("uuid");
const { query } = require("../index");
const { isUuid, toNumber } = require("./shared");

function normalizeProduct(row) {
  if (!row) return row;
  return {
    ...row,
    productType: row.product_type || row.productType || null,
    fichaTecnicaId: row.ficha_tecnica_id ?? row.fichaTecnicaId ?? null,
    price: toNumber(row.price),
    purchase_price: toNumber(row.purchase_price),
    custo_por_unidade: toNumber(row.custo_por_unidade),
    preco_minimo: toNumber(row.preco_minimo),
    preco_minimo_sugerido: toNumber(row.preco_minimo_sugerido),
    cmv_previsto: toNumber(row.cmv_previsto),
    cmv_futuro: toNumber(row.cmv_futuro),
    stock: row.stock == null ? null : Number(row.stock),
  };
}

async function listProducts(ownerId, pagination = null) {
  const hasPagination = pagination && typeof pagination.limit === 'number' && typeof pagination.offset === 'number';
  
  // Query para contar total
  const countSql = ownerId
    ? "SELECT COUNT(*) AS total FROM products WHERE owner_id = $1"
    : "SELECT COUNT(*) AS total FROM products";
  const countParams = ownerId ? [ownerId] : [];
  const countResult = await query(countSql, countParams);
  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  // Query principal com paginação
  const sql = ownerId
    ? `SELECT * FROM products WHERE owner_id = $1 ORDER BY name ASC ${hasPagination ? 'LIMIT $2 OFFSET $3' : ''}`
    : `SELECT * FROM products ORDER BY name ASC ${hasPagination ? 'LIMIT $1 OFFSET $2' : ''}`;
  
  const params = ownerId
    ? (hasPagination ? [ownerId, pagination.limit, pagination.offset] : [ownerId])
    : (hasPagination ? [pagination.limit, pagination.offset] : []);
    
  const result = await query(sql, params);
  
  if (hasPagination) {
    return {
      rows: result.rows.map(normalizeProduct),
      total,
    };
  }
  
  return result.rows.map(normalizeProduct);
}

async function getProductById(id) {
  if (!isUuid(id)) return null;
  const result = await query("SELECT * FROM products WHERE id = $1", [id]);
  return normalizeProduct(result.rows[0] || null);
}

async function createProduct(data) {
  const payload = {
    id: data.id || uuidv4(),
    name: data.name,
    description: data.description || data.descricao || null,
    price: data.price,
    purchase_price: data.purchase_price,
    product_type: data.product_type || data.productType || null,
    owner_id: data.ownerId || null,
    ficha_tecnica_id: data.fichaTecnicaId || null,
    custo_por_unidade: data.custo_por_unidade || null,
    preco_minimo: data.preco_minimo || null,
    preco_minimo_sugerido: data.preco_minimo_sugerido || null,
    cmv_previsto: data.cmv_previsto || null,
    cmv_futuro: data.cmv_futuro || null,
    data_vinculo: data.data_vinculo || null,
    status_produto: data.statusProduto || "ATIVO",
    stock: data.stock != null ? data.stock : null,
  };

  const result = await query(
    `INSERT INTO products
      (id, name, description, price, purchase_price, product_type, owner_id, ficha_tecnica_id,
       custo_por_unidade, preco_minimo, preco_minimo_sugerido, cmv_previsto, cmv_futuro,
       data_vinculo, status_produto, stock, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
     RETURNING *`,
    [
      payload.id,
      payload.name,
      payload.description,
      payload.price,
      payload.purchase_price,
      payload.product_type,
      payload.owner_id,
      payload.ficha_tecnica_id,
      payload.custo_por_unidade,
      payload.preco_minimo,
      payload.preco_minimo_sugerido,
      payload.cmv_previsto,
      payload.cmv_futuro,
      payload.data_vinculo,
      payload.status_produto,
      payload.stock,
    ]
  );
  return normalizeProduct(result.rows[0]);
}

const LINK_FIELDS = [
  "ficha_tecnica_id",
  "custo_por_unidade",
  "preco_minimo",
  "preco_minimo_sugerido",
  "cmv_previsto",
  "cmv_futuro",
  "data_vinculo",
];

function isExplicitNull(payload, field) {
  return Object.prototype.hasOwnProperty.call(payload, field) && payload[field] === null;
}

async function updateProduct(id, payload) {
  const result = await query(
    `UPDATE products
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           purchase_price = COALESCE($5, purchase_price),
           product_type = COALESCE($6, product_type),
           owner_id = COALESCE($7, owner_id),
           ficha_tecnica_id = CASE WHEN $17::boolean THEN NULL ELSE COALESCE($8, ficha_tecnica_id) END,
           custo_por_unidade = CASE WHEN $18::boolean THEN NULL ELSE COALESCE($9, custo_por_unidade) END,
           preco_minimo = CASE WHEN $19::boolean THEN NULL ELSE COALESCE($10, preco_minimo) END,
           preco_minimo_sugerido = CASE WHEN $20::boolean THEN NULL ELSE COALESCE($11, preco_minimo_sugerido) END,
           cmv_previsto = CASE WHEN $21::boolean THEN NULL ELSE COALESCE($12, cmv_previsto) END,
           cmv_futuro = CASE WHEN $22::boolean THEN NULL ELSE COALESCE($13, cmv_futuro) END,
           data_vinculo = CASE WHEN $23::boolean THEN NULL ELSE COALESCE($14, data_vinculo) END,
           status_produto = COALESCE($15, status_produto),
           stock = COALESCE($16, stock),
           updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      payload.name,
      payload.description,
      payload.price,
      payload.purchase_price,
      payload.product_type ?? payload.productType,
      payload.owner_id ?? payload.ownerId,
      payload.ficha_tecnica_id ?? payload.fichaTecnicaId,
      payload.custo_por_unidade,
      payload.preco_minimo,
      payload.preco_minimo_sugerido,
      payload.cmv_previsto,
      payload.cmv_futuro,
      payload.data_vinculo,
      payload.status_produto ?? payload.statusProduto,
      payload.stock,
      // Flags de limpeza: null explícito no payload zera o campo (ex.: remover ficha técnica).
      // Sem isso o COALESCE mantinha o valor antigo e o produto continuava vinculado.
      ...LINK_FIELDS.map((field) => isExplicitNull(payload, field)),
    ]
  );
  return normalizeProduct(result.rows[0] || null);
}

async function deleteProduct(id) {
  const result = await query("DELETE FROM products WHERE id = $1 RETURNING *", [id]);
  return normalizeProduct(result.rows[0] || null);
}

/**
 * Soma `delta` (negativo = baixa) ao estoque do produto numa única instrução atômica,
 * sem ler antes (evita corrida entre vendas simultâneas). Baixa só passa se houver saldo.
 * Retorna o novo estoque, ou null se não havia saldo suficiente / produto não encontrado.
 */
async function adjustProductStock(productId, delta, client) {
  if (!isUuid(productId)) return null;
  const run = client ? client.query.bind(client) : query;
  const result = await run(
    `UPDATE products
        SET stock = stock + $2, updated_at = NOW()
      WHERE id = $1 AND stock IS NOT NULL AND stock + $2 >= 0
      RETURNING stock`,
    [productId, delta]
  );
  return result.rows[0] ? Number(result.rows[0].stock) : null;
}

module.exports = {
  normalizeProduct,
  listProducts,
  getProductById,
  createProduct,
  LINK_FIELDS,
  isExplicitNull,
  updateProduct,
  deleteProduct,
  adjustProductStock,
};
