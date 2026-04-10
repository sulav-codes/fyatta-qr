const express = require("express");
const router = express.Router();
const { validate } = require("../../middlewares/validate.middleware");
const {
  authLimiter,
  publicWriteLimiter,
} = require("../../middlewares/rateLimiter");
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
router.post(
  "/register",
  publicWriteLimiter,
  validate(authValidation.registerBodySchema),
  register,
);
router.post(
  "/login",
  authLimiter,
  validate(authValidation.loginBodySchema),
  login,
);
router.post("/refresh", authLimiter, refreshToken);
router.post("/logout", authLimiter, logout);
router.get("/google/start", authLimiter, googleStart);
router.get(
  "/google/callback",
  authLimiter,
  validate({ query: authValidation.googleCallbackQuerySchema }),
  googleCallback,
);

module.exports = router;
