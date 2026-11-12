/**
 * Cadastro único de insumos (ingredientes e embalagens).
 *
 * O preço de cada insumo fica em um lugar só. Ao mudar o preço ou a embalagem, todas as fichas
 * técnicas que usam o insumo são recalculadas, e os produtos vinculados recebem o novo custo (CMV).
 */
const repo = require("../db/repository");
const recipesService = require("./recipesService");

const MAX_NAME_LENGTH = 120;

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function hasUnsafeText(value) {
  return /<\s*script|--|;/i.test(value);
}

function validatePayload(payload = {}, base = {}) {
  const name = String(payload.name ?? base.name ?? "").trim();
  if (!name) throw badRequest("Nome do insumo é obrigatório");
  if (name.length > MAX_NAME_LENGTH) throw badRequest(`Nome do insumo deve ter no máximo ${MAX_NAME_LENGTH} caracteres`);
  if (hasUnsafeText(name)) throw badRequest("Nome do insumo contém caracteres inválidos");

  const rawQty = payload.packageQuantity ?? base.packageQuantity;
  const packageQuantity = Number(String(rawQty ?? "").replace(",", "."));
  if (!Number.isFinite(packageQuantity) || packageQuantity <= 0) {
    throw badRequest("Quantidade da embalagem deve ser maior que zero");
  }

  let packageUnit;
  try {
    packageUnit = recipesService.normalizeUnit(payload.packageUnit ?? base.packageUnit);
  } catch (_err) {
    throw badRequest("Unidade da embalagem inválida. Use g, kg, ml, l ou un");
  }
  if (!packageUnit) throw badRequest("Unidade da embalagem é obrigatória (g, kg, ml, l ou un)");

  const rawCost = payload.packageCost ?? base.packageCost;
  const packageCost = Number(String(rawCost ?? "").replace(",", "."));
  if (!Number.isFinite(packageCost) || packageCost < 0) {
    throw badRequest("Preço da embalagem deve ser zero ou maior");
  }

  return {
    name,
    packageQuantity: Number(packageQuantity.toFixed(3)),
    packageUnit,
    packageCost: Number(packageCost.toFixed(2)),
  };
}

function ensureOwner(ingredient, user) {
  if (!ingredient) {
    const err = new Error("Insumo não encontrado");
    err.status = 404;
    throw err;
  }
  if (ingredient.ownerId && user && ingredient.ownerId !== user.id) {
    const err = new Error("Você não tem permissão para acessar este insumo");
    err.status = 403;
    throw err;
  }
}

async function list(user) {
  return repo.listIngredients(user ? user.id : null);
}

async function getById(id, user) {
  const ingredient = await repo.getIngredientById(id);
  ensureOwner(ingredient, user);
  const history = await repo.listIngredientPriceHistory(id);
  return { ...ingredient, history };
}

async function create(payload, user) {
  const data = validatePayload(payload);
  if (await repo.ingredientNameExists(user ? user.id : null, data.name)) {
    const err = new Error("Já existe um insumo com esse nome");
    err.status = 409;
    throw err;
  }
  return repo.createIngredient({ ...data, ownerId: user ? user.id : null });
}

async function update(id, payload, user) {
  const current = await repo.getIngredientById(id);
  ensureOwner(current, user);
  const data = validatePayload(payload, current);
  if (await repo.ingredientNameExists(user ? user.id : null, data.name, id)) {
    const err = new Error("Já existe um insumo com esse nome");
    err.status = 409;
    throw err;
  }

  const updated = await repo.updateIngredient(id, data);

  const priceChanged =
    current.packageCost !== data.packageCost ||
    current.packageQuantity !== data.packageQuantity ||
    current.packageUnit !== data.packageUnit;

  let recalculatedRecipes = [];
  let recalculationErrors = [];
  if (priceChanged) {
    await repo.addIngredientPriceHistory(updated);
    const result = await recipesService.recalculateByIngredient(id, user);
    recalculatedRecipes = result.updated;
    recalculationErrors = result.failed;
  }

  return { ...updated, recalculatedRecipes, recalculationErrors };
}

async function remove(id, user) {
  const current = await repo.getIngredientById(id);
  ensureOwner(current, user);
  // Os itens das fichas continuam com o último preço; só deixam de seguir o cadastro
  await repo.deleteIngredient(id);
  return { message: "Insumo removido" };
}

module.exports = { list, getById, create, update, remove, validatePayload };
