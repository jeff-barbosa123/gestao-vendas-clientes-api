const { v4: uuidv4 } = require("uuid");
const { query, withTransaction } = require("../index");
const { isUuid, toNumber } = require("./shared");

function normalizeRecipe(row) {
  if (!row) return row;
  return {
    ...row,
    yield_qty: toNumber(row.yield_qty),
    overhead: toNumber(row.overhead),
    labor: toNumber(row.labor),
    cost_ingredients: toNumber(row.cost_ingredients),
    total_cost: toNumber(row.total_cost),
    cost_per_unit: toNumber(row.cost_per_unit),
    price_minimum: toNumber(row.price_minimum),
    price_suggested: toNumber(row.price_suggested),
    estimated_profit: toNumber(row.estimated_profit),
    margin: row.margin == null ? null : Number(row.margin),
  };
}

// Anexa ingredientes e custos indiretos e expõe os campos em camelCase
async function attachRecipeDetails(recipes) {
  if (recipes.length === 0) return [];
  const ids = recipes.map((r) => r.id);
  const ingRows = await query(
    "SELECT * FROM recipe_ingredients WHERE recipe_id = ANY($1)",
    [ids]
  );
  const overheadRows = await query(
    "SELECT * FROM recipe_overheads WHERE recipe_id = ANY($1)",
    [ids]
  );
  const ingredientsByRecipe = new Map();
  ingRows.rows.forEach((row) => {
    const list = ingredientsByRecipe.get(row.recipe_id) || [];
    list.push(row);
    ingredientsByRecipe.set(row.recipe_id, list);
  });
  const overheadByRecipe = new Map();
  overheadRows.rows.forEach((row) => {
    const list = overheadByRecipe.get(row.recipe_id) || [];
    list.push(row);
    overheadByRecipe.set(row.recipe_id, list);
  });
  return recipes.map((recipe) => ({
    ...recipe,
    yield: recipe.yield_qty,
    yieldType: recipe.yield_type,
    costIngredients: recipe.cost_ingredients,
    totalCost: recipe.total_cost,
    costPerUnit: recipe.cost_per_unit,
    priceMinimum: recipe.price_minimum,
    priceSuggested: recipe.price_suggested,
    marginLabel: recipe.margin_label,
    estimatedProfit: recipe.estimated_profit,
    linkProductId: recipe.link_product_id ?? null,
    ownerId: recipe.owner_id ?? null,
    overheadItems: (overheadByRecipe.get(recipe.id) || []).map((row) => ({
      id: row.id,
      name: row.name,
      cost: Number(row.cost),
    })),
    ingredients: (ingredientsByRecipe.get(recipe.id) || []).map((row) => ({
      id: row.id,
      name: row.name,
      quantity: Number(row.quantity),
      unit: row.unit,
      packUnit: row.pack_unit,
      component: row.component,
      packageQuantity: Number(row.package_quantity),
      cost: Number(row.cost),
      unitCost: Number(row.unit_cost),
      totalCost: Number(row.total_cost),
      ingredientId: row.ingredient_id || null,
    })),
  }));
}

async function listRecipes(ownerId, includeInactive = false) {
  const result = await query(
    `SELECT * FROM recipes
      WHERE ($1::uuid IS NULL OR owner_id = $1)
        AND ($2 = TRUE OR status <> 'INACTIVE')`,
    [ownerId || null, includeInactive]
  );
  return attachRecipeDetails(result.rows.map(normalizeRecipe));
}

async function getRecipeById(id) {
  // Busca direta por id (antes carregava todas as receitas de todos os usuários)
  if (!isUuid(id)) return null;
  const result = await query("SELECT * FROM recipes WHERE id = $1", [id]);
  const [recipe] = await attachRecipeDetails(result.rows.map(normalizeRecipe));
  return recipe || null;
}

async function createRecipe(recipe, ingredients, overheadItems) {
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO recipes
        (id, owner_id, name, description, yield_qty, yield_type, overhead, labor,
         cost_ingredients, total_cost, cost_per_unit, price_minimum, price_suggested,
         margin_label, estimated_profit, status, link_product_id, margin, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())`,
      [
        recipe.id,
        recipe.ownerId,
        recipe.name,
        recipe.description,
        recipe.yield,
        recipe.yieldType,
        recipe.overhead,
        recipe.labor,
        recipe.costIngredients,
        recipe.totalCost,
        recipe.costPerUnit,
        recipe.priceMinimum,
        recipe.priceSuggested,
        recipe.marginLabel,
        recipe.estimatedProfit,
        recipe.status || "ACTIVE",
        recipe.linkProductId,
        recipe.margin ?? null,
      ]
    );

    for (const ing of ingredients || []) {
      await client.query(
        `INSERT INTO recipe_ingredients
          (id, recipe_id, name, quantity, unit, component, package_quantity, pack_unit, cost, unit_cost, total_cost, ingredient_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          ing.id || uuidv4(),
          recipe.id,
          ing.name,
          ing.quantity,
          ing.unit,
          ing.component || null,
          ing.packageQuantity,
          ing.packUnit || null,
          ing.cost,
          ing.unitCost,
          ing.totalCost,
          ing.ingredientId || null,
        ]
      );
    }

    for (const overhead of overheadItems || []) {
      await client.query(
        `INSERT INTO recipe_overheads (id, recipe_id, name, cost)
         VALUES ($1,$2,$3,$4)`,
        [overhead.id || uuidv4(), recipe.id, overhead.name, overhead.cost]
      );
    }

    const created = await client.query("SELECT * FROM recipes WHERE id = $1", [recipe.id]);
    return created.rows[0];
  });
}

async function updateRecipe(id, recipe, ingredients, overheadItems) {
  return withTransaction(async (client) => {
    await client.query(
      `UPDATE recipes
         SET name = $2,
             description = $3,
             yield_qty = $4,
             yield_type = $5,
             overhead = $6,
             labor = $7,
             cost_ingredients = $8,
             total_cost = $9,
             cost_per_unit = $10,
             price_minimum = $11,
             price_suggested = $12,
             margin_label = $13,
             estimated_profit = $14,
             status = $15,
             link_product_id = $16,
             margin = COALESCE($17, margin),
             updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        recipe.name,
        recipe.description,
        recipe.yield,
        recipe.yieldType,
        recipe.overhead,
        recipe.labor,
        recipe.costIngredients,
        recipe.totalCost,
        recipe.costPerUnit,
        recipe.priceMinimum,
        recipe.priceSuggested,
        recipe.marginLabel,
        recipe.estimatedProfit,
        recipe.status || "ACTIVE",
        recipe.linkProductId,
        recipe.margin ?? null,
      ]
    );

    await client.query("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [id]);
    await client.query("DELETE FROM recipe_overheads WHERE recipe_id = $1", [id]);

    for (const ing of ingredients || []) {
      await client.query(
        `INSERT INTO recipe_ingredients
          (id, recipe_id, name, quantity, unit, component, package_quantity, pack_unit, cost, unit_cost, total_cost, ingredient_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          ing.id || uuidv4(),
          id,
          ing.name,
          ing.quantity,
          ing.unit,
          ing.component || null,
          ing.packageQuantity,
          ing.packUnit || null,
          ing.cost,
          ing.unitCost,
          ing.totalCost,
          ing.ingredientId || null,
        ]
      );
    }

    for (const overhead of overheadItems || []) {
      await client.query(
        `INSERT INTO recipe_overheads (id, recipe_id, name, cost)
         VALUES ($1,$2,$3,$4)`,
        [overhead.id || uuidv4(), id, overhead.name, overhead.cost]
      );
    }

    const updated = await client.query("SELECT * FROM recipes WHERE id = $1", [id]);
    return updated.rows[0];
  });
}

async function softDeleteRecipe(id) {
  const result = await query(
    "UPDATE recipes SET status = 'INACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  normalizeRecipe,
  attachRecipeDetails,
  listRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  softDeleteRecipe,
};
