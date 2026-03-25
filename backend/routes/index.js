const express = require("express");
const router = express.Router();

// Import all route modules
router.use("/auth", require("./authRoutes"));

// PUBLIC routes (no authentication required) - MUST come before protected /api routes
router.use("/api", require("./publicRoutes"));
router.use("/api", require("./waiterRoutes"));
router.use("/api/payment", require("./paymentRoutes"));

// PROTECTED routes (require authentication)
router.use("/api", require("./staffRoutes"));
router.use("/api", require("./orderRoutes"));
router.use("/api", require("./vendorRoutes"));
router.use("/api", require("./menuRoutes"));
router.use("/api", require("./tableRoutes"));

module.exports = router;
