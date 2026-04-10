const express = require("express");
const router = express.Router();
const { validate } = require("../../middlewares/validate.middleware");
const authValidation = require("./auth.validation");
const {
  register,
  login,
  logout,
  refreshToken,
  googleStart,
  googleCallback,
} = require("./auth.controller");

// Public routes
router.post("/register", validate(authValidation.registerBodySchema), register);
router.post("/login", validate(authValidation.loginBodySchema), login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/google/start", googleStart);
router.get(
  "/google/callback",
  validate({ query: authValidation.googleCallbackQuerySchema }),
  googleCallback,
);

module.exports = router;
