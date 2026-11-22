const { randomUUID } = require('crypto');
const { query } = require('../index');

const TABLES = { product: 'products', customer: 'customers' };

function mapRow(r) {
  return {
    id: r.id,
    key: r.key,
    label: r.label,
    type: r.field_type,
    options: Array.isArray(r.options) ? r.options : [],
    required: !!r.required,
    position: r.position,
  };
}

async function list(ownerId, entity) {
  const result = await query(
    `SELECT id, key, label, field_type, options, required, position
       FROM custom_fields WHERE owner_id = $1 AND entity = $2 ORDER BY position ASC, created_at ASC`,
    [ownerId, entity]
  );
  return result.rows.map(mapRow);
}

// Substitui a lista de definicoes: upsert por key e remove as que sairam (valores antigos ficam ignorados).
async function replace(ownerId, entity, fields) {
  for (const [index, f] of fields.entries()) {
    await query(
      `INSERT INTO custom_fields (id, owner_id, entity, key, label, field_type, options, required, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
       ON CONFLICT (owner_id, entity, key) DO UPDATE
         SET label = EXCLUDED.label, field_type = EXCLUDED.field_type, options = EXCLUDED.options,
             required = EXCLUDED.required, position = EXCLUDED.position, updated_at = NOW()`,
      [randomUUID(), ownerId, entity, f.key, f.label, f.type, JSON.stringify(f.options || []), !!f.required, index]
    );
  }
  await query(`DELETE FROM custom_fields WHERE owner_id = $1 AND entity = $2 AND NOT (key = ANY($3::text[]))`, [
    ownerId,
    entity,
    fields.map((f) => f.key),
  ]);
  return list(ownerId, entity);
}

// Merge atomico: patch (chaves com valor) e remove (chaves limpas). Retorna extra ou null se nao existir na empresa.
async function applyValues(ownerId, entity, id, patch, remove) {
  const table = TABLES[entity];
  if (!table) return null;
  const result = await query(
    `UPDATE ${table} SET extra = (COALESCE(extra, '{}'::jsonb) || $1::jsonb) - $2::text[]
      WHERE id = $3 AND owner_id = $4 RETURNING extra`,
    [JSON.stringify(patch), remove, id, ownerId]
  );
  return result.rows[0] ? result.rows[0].extra : null;
}

module.exports = { list, replace, applyValues };
