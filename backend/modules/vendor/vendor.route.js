const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const vendorController = require("./vendor.controller");
const upload = require("../../middlewares/multerConfig");

// All vendor routes require authentication
router.use(authenticate);

// Vendor profile routes
router.get("/vendors/:vendorId/profile", vendorController.getProfile);
router.put(
  "/vendors/:vendorId/profile",
  upload.single("logo"),
  vendorController.updateProfile,
);

// Dashboard and analytics routes
router.get(
  "/vendors/:vendorId/dashboard/stats",
  vendorController.getDashboardStats,
);
router.get(
  "/vendors/:vendorId/dashboard/sales",
  vendorController.getSalesReport,
);
router.get(
  "/vendors/:vendorId/dashboard/popular-items",
  vendorController.getPopularItems,
);
router.get(
  "/vendors/:vendorId/dashboard/recent-orders",
  vendorController.getRecentOrders,
);

module.exports = router;
