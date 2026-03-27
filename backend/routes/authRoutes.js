const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  refreshToken,
  googleStart,
  googleCallback,
} = require("../controllers/authController");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/google/start", googleStart);
router.get("/google/callback", googleCallback);

module.exports = router;
