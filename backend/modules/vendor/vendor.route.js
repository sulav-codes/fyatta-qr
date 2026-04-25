import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import validateMiddleware from "../../middlewares/validate.middleware.js";
import * as vendorController from "./vendor.controller.js";
import * as vendorValidation from "./vendor.validation.js";
import upload from "../../middlewares/multerConfig.js";

const router = Router();
const { authenticate } = authMiddleware;
const { validate } = validateMiddleware;

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

export default router;
