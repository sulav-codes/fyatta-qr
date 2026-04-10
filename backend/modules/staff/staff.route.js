const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const staffController = require("./staff.controller");
const staffValidation = require("./staff.validation");

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

module.exports = router;
