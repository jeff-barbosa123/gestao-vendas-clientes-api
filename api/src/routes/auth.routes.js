
const express = require("express");
const router = express.Router();

const loginValidator = require("../middleware/loginValidator");
const rateLimit = require("../middleware/rateLimitLogin");
const blockUser = require("../middleware/blockUser");
const controller = require("../controllers/authController");

router.get("/login", (req, res) => res.status(405).send());

router.post("/login", loginValidator, blockUser, rateLimit, controller.login);

module.exports = router;
