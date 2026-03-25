const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  googleStart,
  googleCallback,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.get("/google/start", googleStart);
router.get("/google/callback", googleCallback);

// Protected routes
router.post("/logout", authenticate, logout);

module.exports = router;
