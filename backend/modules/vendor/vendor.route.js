const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const vendorController = require("./vendor.controller");
const vendorValidation = require("./vendor.validation");
const upload = require("../../middlewares/multerConfig");

// Vendor profile routes
router.get(
  "/vendors/:vendorId/profile",
  authenticate,
  validate({ params: vendorValidation.vendorParamsSchema }),
  vendorController.getProfile,
);
router.put(
  "/vendors/:vendorId/profile",
  authenticate,
  upload.single("logo"),
  validate({
    params: vendorValidation.vendorParamsSchema,
    body: vendorValidation.updateProfileBodySchema,
  }),
  vendorController.updateProfile,
);

// Dashboard and analytics routes
router.get(
  "/vendors/:vendorId/dashboard/stats",
  authenticate,
  validate({ params: vendorValidation.vendorParamsSchema }),
  vendorController.getDashboardStats,
);
router.get(
  "/vendors/:vendorId/dashboard/sales",
  authenticate,
  validate({
    params: vendorValidation.vendorParamsSchema,
    query: vendorValidation.salesReportQuerySchema,
  }),
  vendorController.getSalesReport,
);
router.get(
  "/vendors/:vendorId/dashboard/popular-items",
  authenticate,
  validate({
    params: vendorValidation.vendorParamsSchema,
    query: vendorValidation.paginationQuerySchema,
  }),
  vendorController.getPopularItems,
);
router.get(
  "/vendors/:vendorId/dashboard/recent-orders",
  authenticate,
  validate({
    params: vendorValidation.vendorParamsSchema,
    query: vendorValidation.paginationQuerySchema,
  }),
  vendorController.getRecentOrders,
);

module.exports = router;
