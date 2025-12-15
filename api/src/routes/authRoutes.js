const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const blockUser = require("../middleware/blockUser");
const loginValidator = require("../middleware/loginValidator");
const rateLimitLogin = require("../middleware/rateLimitLogin");
const { authenticate } = require("../middleware/authMiddleware");

const methodNotAllowed = (req, res) =>
  res.status(405).json({ error: "Metodo nao permitido" });

router
  .route("/login")
  .post(rateLimitLogin, loginValidator, blockUser, authController.login)
  .all(methodNotAllowed);

router
  .route("/refresh")
  .post(authController.refresh)
  .all(methodNotAllowed);

router
  .route("/logout")
  .post(authenticate, authController.logout)
  .all(methodNotAllowed);

router
  .route("/me")
  .get(authenticate, authController.me)
  .all(methodNotAllowed);

router
  .route("/validate")
  .get(authenticate, authController.validate)
  .all(methodNotAllowed);

router.post("/register", authController.register);

module.exports = router;
