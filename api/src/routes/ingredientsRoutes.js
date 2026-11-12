const express = require("express");
const router = express.Router();
const ingredientsController = require("../controllers/ingredientsController");
const { authenticateStrict } = require("../middleware/authMiddlewareStrict");
const { rateLimit } = require("../middleware/rateLimit");

router.use(authenticateStrict);
router.use(rateLimit({ windowMs: 60_000, max: 120, message: "Muitas requisicoes, tente novamente mais tarde" }));

/**
 * @openapi
 * /api/ingredients:
 *   get:
 *     summary: Lista os insumos do usuário (com quantas fichas usam cada um)
 *   post:
 *     summary: Cadastra um insumo (name, packageQuantity, packageUnit, packageCost)
 * /api/ingredients/{id}:
 *   get:
 *     summary: Detalhe do insumo com histórico de preços
 *   put:
 *     summary: Atualiza o insumo; se o preço mudar, recalcula as fichas e produtos vinculados
 *   delete:
 *     summary: Remove o insumo (as fichas mantêm o último preço)
 * /api/ingredients/low-stock:
 *   get:
 *     summary: Insumos no estoque mínimo ou abaixo
 * /api/ingredients/{id}/stock/purchases:
 *   post:
 *     summary: Entrada de compra (quantity, unit, totalCost opcional; com totalCost o preço é atualizado e as fichas recalculadas)
 * /api/ingredients/{id}/stock/adjust:
 *   post:
 *     summary: Ajuste por contagem (quantity, unit) - também liga o controle de estoque
 * /api/ingredients/{id}/stock/min:
 *   put:
 *     summary: Define o estoque mínimo (minStock, unit; vazio remove)
 * /api/ingredients/{id}/stock:
 *   delete:
 *     summary: Desliga o controle de estoque do insumo
 * /api/ingredients/{id}/stock/movements:
 *   get:
 *     summary: Últimas movimentações (compra, venda, devolução, ajuste)
 */
router.get("/", ingredientsController.list);
router.get("/low-stock", ingredientsController.lowStock);
router.post("/", ingredientsController.create);
router.get("/:id", ingredientsController.getById);
router.put("/:id", ingredientsController.update);
router.delete("/:id", ingredientsController.remove);
router.get("/:id/stock/movements", ingredientsController.movements);
router.post("/:id/stock/purchases", ingredientsController.purchase);
router.post("/:id/stock/adjust", ingredientsController.adjust);
router.put("/:id/stock/min", ingredientsController.setMinStock);
router.delete("/:id/stock", ingredientsController.disableStock);

module.exports = router;
