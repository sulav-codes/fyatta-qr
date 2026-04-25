import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import validateMiddleware from "../../middlewares/validate.middleware.js";
import * as staffController from "./staff.controller.js";
import * as staffValidation from "./staff.validation.js";

const router = Router();
const { authenticate } = authMiddleware;
const { validate } = validateMiddleware;

// Staff CRUD routes for vendors
router.get(
  "/vendors/:vendorId/staff",
  authenticate,
  validate({ params: staffValidation.vendorParamsSchema }),
  staffController.getStaff,
);
router.get(
  "/vendors/:vendorId/staff/:staffId",
  authenticate,
  validate({ params: staffValidation.vendorStaffParamsSchema }),
  staffController.getStaffMember,
);
router.post(
  "/vendors/:vendorId/staff",
  authenticate,
  validate({
    params: staffValidation.vendorParamsSchema,
    body: staffValidation.createStaffBodySchema,
  }),
  staffController.createStaff,
);
router.put(
  "/vendors/:vendorId/staff/:staffId",
  authenticate,
  validate({
    params: staffValidation.vendorStaffParamsSchema,
    body: staffValidation.updateStaffBodySchema,
  }),
  staffController.updateStaff,
);
router.delete(
  "/vendors/:vendorId/staff/:staffId",
  authenticate,
  validate({ params: staffValidation.vendorStaffParamsSchema }),
  staffController.deleteStaff,
);
router.patch(
  "/vendors/:vendorId/staff/:staffId/toggle-status",
  authenticate,
  validate({ params: staffValidation.vendorStaffParamsSchema }),
  staffController.toggleStaffStatus,
);

export default router;
