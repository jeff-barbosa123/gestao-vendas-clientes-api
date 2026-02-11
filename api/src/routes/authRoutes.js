const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const blockUser = require("../middleware/blockUser");
const loginValidator = require("../middleware/loginValidator");
const rateLimitLogin = require("../middleware/rateLimitLogin");
const { authenticate } = require("../middleware/authMiddleware");
const { rateLimit } = require("../middleware/rateLimit");

const methodNotAllowed = (req, res) =>
  res.status(405).json({ error: "M\u00e9todo n\u00e3o permitido" });

// Rate limiting for sensitive endpoints
// Em desenvolvimento, limites mais flexíveis para facilitar testes
const isDevelopment = process.env.NODE_ENV !== 'production';
const registerRateLimit = rateLimit({ 
  windowMs: 60 * 60 * 1000, 
  max: isDevelopment ? 20 : 5, 
  message: "Muitas tentativas de registro. Tente novamente em 1 hora." 
});
const forgotRateLimit = rateLimit({ 
  windowMs: isDevelopment ? 15 * 60 * 1000 : 60 * 60 * 1000, // 15 min em dev, 1 hora em prod
  max: isDevelopment ? 10 : 3, // 10 tentativas em dev, 3 em prod
  message: "Muitas tentativas de recuperação. Tente novamente em " + (isDevelopment ? "15 minutos" : "1 hora") + "." 
});
const resetRateLimit = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: isDevelopment ? 10 : 5, 
  message: "Muitas tentativas de reset. Tente novamente em 15 minutos." 
});
const refreshRateLimit = rateLimit({ 
  windowMs: 60 * 1000, 
  max: 10, 
  message: "Muitas tentativas de refresh. Tente novamente em 1 minuto." 
});

router
  .route("/login")
  .post(rateLimitLogin, loginValidator, blockUser, authController.login)
  .all(methodNotAllowed);

router
  .route("/refresh")
  .post(refreshRateLimit, authController.refresh)
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
  .post(forgotRateLimit, authController.forgot)
  .all(methodNotAllowed);

router
  .route("/reset")
  .post(resetRateLimit, authController.reset)
  .all(methodNotAllowed);

router
  .route("/change-password")
  .post(authenticate, rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: "Muitas tentativas. Tente novamente em 15 minutos." }), authController.changePassword)
  .all(methodNotAllowed);

router.post("/register", registerRateLimit, authController.register);

module.exports = router;
