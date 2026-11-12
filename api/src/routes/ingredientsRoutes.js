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
 */
router.get("/", ingredientsController.list);
router.post("/", ingredientsController.create);
router.get("/:id", ingredientsController.getById);
router.put("/:id", ingredientsController.update);
router.delete("/:id", ingredientsController.remove);

module.exports = router;
