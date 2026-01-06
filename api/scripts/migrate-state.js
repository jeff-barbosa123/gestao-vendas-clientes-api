const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { query, withTransaction } = require("../src/db");

function usage() {
  console.log(
    "Usage:\n" +
      "  node api/scripts/migrate-state.js --export <path>\n" +
      "  node api/scripts/migrate-state.js --import <path> [--force]\n"
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { exportPath: null, importPath: null, force: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--export") {
      config.exportPath = args[i + 1];
      i += 1;
    } else if (arg === "--import") {
      config.importPath = args[i + 1];
      i += 1;
    } else if (arg === "--force") {
      config.force = true;
    }
  }
  return config;
}

function toNumber(value, fallback = null) {
  if (value == null) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

async function exportState(outputPath) {
  const users = (await query("SELECT * FROM users")).rows.map((row) => ({
    id: row.id,
    email: row.email,
    password: row.password,
    name: row.name,
    statusUsuario: row.status_usuario,
    dataUltimoLogin: row.data_ultimo_login,
    tentativasFalha: row.tentativas_falha,
    blocked: row.blocked,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const customers = (await query("SELECT * FROM customers")).rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  }));

  const products = (await query("SELECT * FROM products")).rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: toNumber(row.price, 0),
    purchase_price: toNumber(row.purchase_price, 0),
    productType: row.product_type,
    ownerId: row.owner_id,
    fichaTecnicaId: row.ficha_tecnica_id,
    custo_por_unidade: toNumber(row.custo_por_unidade, null),
    preco_minimo: toNumber(row.preco_minimo, null),
    preco_minimo_sugerido: toNumber(row.preco_minimo_sugerido, null),
    cmv_previsto: toNumber(row.cmv_previsto, null),
    cmv_futuro: toNumber(row.cmv_futuro, null),
    data_vinculo: row.data_vinculo,
    statusProduto: row.status_produto,
    stock: row.stock,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const recipesRows = (await query("SELECT * FROM recipes")).rows;
  const recipeIds = recipesRows.map((r) => r.id);
  const ingredientsRows =
    recipeIds.length > 0
      ? (await query("SELECT * FROM recipe_ingredients WHERE recipe_id = ANY($1)", [recipeIds]))
          .rows
      : [];
  const overheadRows =
    recipeIds.length > 0
      ? (await query("SELECT * FROM recipe_overheads WHERE recipe_id = ANY($1)", [recipeIds])).rows
      : [];

  const ingredientsByRecipe = new Map();
  ingredientsRows.forEach((row) => {
    const list = ingredientsByRecipe.get(row.recipe_id) || [];
    list.push({
      id: row.id,
      name: row.name,
      quantity: toNumber(row.quantity, 0),
      unit: row.unit,
      packUnit: row.pack_unit,
      packageQuantity: toNumber(row.package_quantity, 0),
      cost: toNumber(row.cost, 0),
      unitCost: toNumber(row.unit_cost, 0),
      totalCost: toNumber(row.total_cost, 0),
    });
    ingredientsByRecipe.set(row.recipe_id, list);
  });

  const overheadByRecipe = new Map();
  overheadRows.forEach((row) => {
    const list = overheadByRecipe.get(row.recipe_id) || [];
    list.push({
      id: row.id,
      name: row.name,
      cost: toNumber(row.cost, 0),
    });
    overheadByRecipe.set(row.recipe_id, list);
  });

  const recipes = recipesRows.map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    yield: toNumber(row.yield_qty, 0),
    yieldType: row.yield_type,
    overhead: toNumber(row.overhead, 0),
    labor: toNumber(row.labor, 0),
    costIngredients: toNumber(row.cost_ingredients, 0),
    totalCost: toNumber(row.total_cost, 0),
    costPerUnit: toNumber(row.cost_per_unit, 0),
    priceMinimum: toNumber(row.price_minimum, 0),
    priceSuggested: toNumber(row.price_suggested, 0),
    marginLabel: row.margin_label,
    estimatedProfit: toNumber(row.estimated_profit, 0),
    status: row.status,
    linkProductId: row.link_product_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ingredients: ingredientsByRecipe.get(row.id) || [],
    overheadItems: overheadByRecipe.get(row.id) || [],
  }));

  const salesRows = (await query("SELECT * FROM sales")).rows;
  const saleIds = salesRows.map((s) => s.id);
  const saleItems =
    saleIds.length > 0
      ? (await query("SELECT * FROM sale_items WHERE sale_id = ANY($1)", [saleIds])).rows
      : [];
  const itemsBySale = new Map();
  saleItems.forEach((row) => {
    const list = itemsBySale.get(row.sale_id) || [];
    list.push({
      id: row.id,
      productId: row.product_id,
      quantity: toNumber(row.quantity, 0),
      unitPrice: toNumber(row.unit_price, 0),
      cmv: toNumber(row.cmv, null),
    });
    itemsBySale.set(row.sale_id, list);
  });

  const sales = salesRows.map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    ownerId: row.owner_id,
    total: toNumber(row.total, 0),
    cmv: toNumber(row.cmv, null),
    date: row.date,
    status: row.status,
    statusVenda: row.status_venda,
    canceledAt: row.canceled_at,
    createdAt: row.created_at,
    items: itemsBySale.get(row.id) || [],
  }));

  const payload = { users, customers, products, recipes, sales };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Exported ${recipes.length} recipes to ${outputPath}`);
}

async function importState(inputPath, force) {
  const raw = fs.readFileSync(inputPath, "utf8");
  const data = JSON.parse(raw);

  await withTransaction(async (client) => {
    if (force) {
      await client.query("TRUNCATE sale_items, sales, recipe_ingredients, recipe_overheads, recipes, products, customers, users RESTART IDENTITY CASCADE");
    }

    for (const user of data.users || []) {
      await client.query(
        `INSERT INTO users (id, email, password, name, status_usuario, data_ultimo_login, tentativas_falha, blocked, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,NOW()),$10)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password = EXCLUDED.password,
           name = EXCLUDED.name,
           status_usuario = EXCLUDED.status_usuario,
           data_ultimo_login = EXCLUDED.data_ultimo_login,
           tentativas_falha = EXCLUDED.tentativas_falha,
           blocked = EXCLUDED.blocked,
           updated_at = EXCLUDED.updated_at`,
        [
          user.id || uuidv4(),
          user.email,
          user.password,
          user.name,
          user.statusUsuario || "ATIVO",
          user.dataUltimoLogin || null,
          user.tentativasFalha || 0,
          !!user.blocked,
          user.createdAt || null,
          user.updatedAt || null,
        ]
      );
    }

    for (const customer of data.customers || []) {
      await client.query(
        `INSERT INTO customers (id, name, email, phone, owner_id, created_at)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6,NOW()))
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           owner_id = EXCLUDED.owner_id`,
        [
          customer.id || uuidv4(),
          customer.name,
          customer.email,
          customer.phone || null,
          customer.ownerId || null,
          customer.createdAt || null,
        ]
      );
    }

    for (const product of data.products || []) {
      await client.query(
        `INSERT INTO products
          (id, name, description, price, purchase_price, product_type, owner_id, ficha_tecnica_id,
           custo_por_unidade, preco_minimo, preco_minimo_sugerido, cmv_previsto, cmv_futuro,
           data_vinculo, status_produto, stock, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,COALESCE($17,NOW()),$18)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           purchase_price = EXCLUDED.purchase_price,
           product_type = EXCLUDED.product_type,
           owner_id = EXCLUDED.owner_id,
           ficha_tecnica_id = EXCLUDED.ficha_tecnica_id,
           custo_por_unidade = EXCLUDED.custo_por_unidade,
           preco_minimo = EXCLUDED.preco_minimo,
           preco_minimo_sugerido = EXCLUDED.preco_minimo_sugerido,
           cmv_previsto = EXCLUDED.cmv_previsto,
           cmv_futuro = EXCLUDED.cmv_futuro,
           data_vinculo = EXCLUDED.data_vinculo,
           status_produto = EXCLUDED.status_produto,
           stock = EXCLUDED.stock,
           updated_at = EXCLUDED.updated_at`,
        [
          product.id || uuidv4(),
          product.name,
          product.description || null,
          toNumber(product.price, 0),
          toNumber(product.purchase_price, 0),
          product.productType || product.product_type || "RESALE",
          product.ownerId || null,
          product.fichaTecnicaId || null,
          toNumber(product.custo_por_unidade, null),
          toNumber(product.preco_minimo, null),
          toNumber(product.preco_minimo_sugerido, null),
          toNumber(product.cmv_previsto, null),
          toNumber(product.cmv_futuro, null),
          product.data_vinculo || null,
          product.statusProduto || "ATIVO",
          product.stock != null ? product.stock : null,
          product.createdAt || null,
          product.updatedAt || null,
        ]
      );
    }

    for (const recipe of data.recipes || []) {
      const recipeId = recipe.id || uuidv4();
      await client.query(
        `INSERT INTO recipes
          (id, owner_id, name, description, yield_qty, yield_type, overhead, labor,
           cost_ingredients, total_cost, cost_per_unit, price_minimum, price_suggested,
           margin_label, estimated_profit, status, link_product_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,COALESCE($18,NOW()),$19)
         ON CONFLICT (id) DO UPDATE SET
           owner_id = EXCLUDED.owner_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           yield_qty = EXCLUDED.yield_qty,
           yield_type = EXCLUDED.yield_type,
           overhead = EXCLUDED.overhead,
           labor = EXCLUDED.labor,
           cost_ingredients = EXCLUDED.cost_ingredients,
           total_cost = EXCLUDED.total_cost,
           cost_per_unit = EXCLUDED.cost_per_unit,
           price_minimum = EXCLUDED.price_minimum,
           price_suggested = EXCLUDED.price_suggested,
           margin_label = EXCLUDED.margin_label,
           estimated_profit = EXCLUDED.estimated_profit,
           status = EXCLUDED.status,
           link_product_id = EXCLUDED.link_product_id,
           updated_at = EXCLUDED.updated_at`,
        [
          recipeId,
          recipe.ownerId || null,
          recipe.name,
          recipe.description || null,
          toNumber(recipe.yield, 0),
          recipe.yieldType,
          toNumber(recipe.overhead, 0),
          toNumber(recipe.labor, 0),
          toNumber(recipe.costIngredients, 0),
          toNumber(recipe.totalCost, 0),
          toNumber(recipe.costPerUnit, 0),
          toNumber(recipe.priceMinimum, 0),
          toNumber(recipe.priceSuggested, 0),
          recipe.marginLabel || "0%",
          toNumber(recipe.estimatedProfit, 0),
          recipe.status || "ACTIVE",
          recipe.linkProductId || null,
          recipe.createdAt || null,
          recipe.updatedAt || null,
        ]
      );

      await client.query("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [recipeId]);
      await client.query("DELETE FROM recipe_overheads WHERE recipe_id = $1", [recipeId]);

      for (const ing of recipe.ingredients || []) {
        await client.query(
          `INSERT INTO recipe_ingredients
            (id, recipe_id, name, quantity, unit, component, package_quantity, pack_unit, cost, unit_cost, total_cost)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            ing.id || uuidv4(),
            recipeId,
            ing.name,
            toNumber(ing.quantity, 0),
            ing.unit || null,
            ing.component || null,
            toNumber(ing.packageQuantity, 1),
            ing.packUnit || null,
            toNumber(ing.cost, 0),
            toNumber(ing.unitCost, 0),
            toNumber(ing.totalCost, 0),
          ]
        );
      }

      for (const overhead of recipe.overheadItems || []) {
        await client.query(
          `INSERT INTO recipe_overheads (id, recipe_id, name, cost)
           VALUES ($1,$2,$3,$4)`,
          [overhead.id || uuidv4(), recipeId, overhead.name, toNumber(overhead.cost, 0)]
        );
      }
    }

    for (const sale of data.sales || []) {
      const saleId = sale.id || uuidv4();
      await client.query(
        `INSERT INTO sales
          (id, customer_id, customer_name, owner_id, total, cmv, date, status, status_venda, canceled_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,NOW()))
         ON CONFLICT (id) DO UPDATE SET
           customer_id = EXCLUDED.customer_id,
           customer_name = EXCLUDED.customer_name,
           owner_id = EXCLUDED.owner_id,
           total = EXCLUDED.total,
           cmv = EXCLUDED.cmv,
           date = EXCLUDED.date,
           status = EXCLUDED.status,
           status_venda = EXCLUDED.status_venda,
           canceled_at = EXCLUDED.canceled_at`,
        [
          saleId,
          sale.customerId || null,
          sale.customerName || null,
          sale.ownerId || null,
          toNumber(sale.total, 0),
          toNumber(sale.cmv, null),
          sale.date || new Date().toISOString(),
          sale.status || "ACTIVE",
          sale.statusVenda || "ativa",
          sale.canceledAt || null,
          sale.createdAt || null,
        ]
      );

      await client.query("DELETE FROM sale_items WHERE sale_id = $1", [saleId]);
      for (const item of sale.items || []) {
        await client.query(
          `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, cmv)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            item.id || uuidv4(),
            saleId,
            item.productId || null,
            toNumber(item.quantity, 1),
            toNumber(item.unitPrice, 0),
            toNumber(item.cmv, null),
          ]
        );
      }
    }
  });

  console.log("Import completed.");
}

async function main() {
  const args = parseArgs();
  if (args.exportPath) {
    await exportState(args.exportPath);
    return;
  }
  if (args.importPath) {
    await importState(args.importPath, args.force);
    return;
  }
  usage();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
