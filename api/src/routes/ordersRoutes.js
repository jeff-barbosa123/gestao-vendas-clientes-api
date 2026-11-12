const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/ordersController");
const { authenticateStrict } = require("../middleware/authMiddlewareStrict");
const { rateLimit } = require("../middleware/rateLimit");

router.use(authenticateStrict);
router.use(rateLimit({ windowMs: 60_000, max: 120, message: "Muitas requisicoes, tente novamente mais tarde" }));

/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: Lista encomendas (filtros from, to e status=PENDING,READY,DELIVERED,CANCELED)
 *   post:
 *     summary: Cria encomenda (customerId ou customerName, customerPhone, deliveryAt, items, deposit, depositMethod, notes)
 * /api/orders/needs:
 *   get:
 *     summary: Insumos que as encomendas em aberto do período vão consumir, comparados com o estoque
 * /api/orders/{id}:
 *   get:
 *     summary: Detalhe da encomenda
 *   put:
 *     summary: Altera encomenda em aberto
 * /api/orders/{id}/status:
 *   post:
 *     summary: Muda o status (READY, PENDING, CANCELED ou DELIVERED; entregar cria a venda com paymentMethod)
 */
router.get("/", ordersController.list);
router.get("/needs", ordersController.needs);
router.post("/", ordersController.create);
router.get("/:id", ordersController.getById);
router.put("/:id", ordersController.update);
router.post("/:id/status", ordersController.changeStatus);

module.exports = router;
