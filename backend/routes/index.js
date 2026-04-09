const express = require("express");
const router = express.Router();

// Import all route modules
router.use("/auth", require("../modules/auth/auth.route"));

// PUBLIC routes (no authentication required)
router.use("/api", require("../modules/notification/notification.route"));
router.use("/api/payment", require("../modules/payment/payment.route"));
router.use("/api", require("../modules/order/order.route"));

// PROTECTED routes (require authentication)
router.use("/api", require("../modules/staff/staff.route"));
router.use("/api", require("../modules/vendor/vendor.route"));
router.use("/api", require("../modules/menu/menu.route"));
router.use("/api", require("../modules/table/table.route"));

module.exports = router;
