const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const blockUser = require("../middleware/blockUser");
const loginValidator = require("../middleware/loginValidator");
const rateLimitLogin = require("../middleware/rateLimitLogin");
const { authenticate } = require("../middleware/authMiddleware");

const methodNotAllowed = (req, res) =>
  res.status(405).json({ error: "M\u00e9todo n\u00e3o permitido" });

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
  .put(authenticate, authController.updateProfile)
  .all(methodNotAllowed);

router
  .route("/validate")
  .get(authenticate, authController.validate)
  .all(methodNotAllowed);

router
  .route("/forgot")
  .post(authController.forgot)
  .all(methodNotAllowed);

router
  .route("/reset")
  .post(authController.reset)
  .all(methodNotAllowed);

router
  .route("/change-password")
  .post(authenticate, authController.changePassword)
  .all(methodNotAllowed);

router.post("/register", authController.register);

module.exports = router;
