const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const vendorController = require("./vendor.controller");
const upload = require("../../middlewares/multerConfig");

// Vendor profile routes
router.get(
  "/vendors/:vendorId/profile",
  authenticate,
  vendorController.getProfile,
);
router.put(
  "/vendors/:vendorId/profile",
  authenticate,
  upload.single("logo"),
  vendorController.updateProfile,
);

// Dashboard and analytics routes
router.get(
  "/vendors/:vendorId/dashboard/stats",
  authenticate,
  vendorController.getDashboardStats,
);
router.get(
  "/vendors/:vendorId/dashboard/sales",
  authenticate,
  vendorController.getSalesReport,
);
router.get(
  "/vendors/:vendorId/dashboard/popular-items",
  authenticate,
  vendorController.getPopularItems,
);
router.get(
  "/vendors/:vendorId/dashboard/recent-orders",
  authenticate,
  vendorController.getRecentOrders,
);

module.exports = router;
