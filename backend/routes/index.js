const express = require("express");
const router = express.Router();

// Import all route modules
router.use("/auth", require("./authRoutes"));
router.use("/api", require("./publicRoutes"));

// Payment routes (must come before vendorRoutes to avoid authentication)
router.use("/api/payment", require("./paymentRoutes"));

// Order routes must come before vendor routes
// because orderRoutes has public customer endpoints
router.use("/api", require("./orderRoutes"));
router.use("/api", require("./vendorRoutes"));
router.use("/api", require("./menuRoutes"));
router.use("/api", require("./tableRoutes"));

module.exports = router;
