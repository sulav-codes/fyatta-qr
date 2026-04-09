const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const staffController = require("./staff.controller");

// Staff CRUD routes for vendors
router.get("/vendors/:vendorId/staff", authenticate, staffController.getStaff);
router.get(
  "/vendors/:vendorId/staff/:staffId",
  authenticate,
  staffController.getStaffMember,
);
router.post(
  "/vendors/:vendorId/staff",
  authenticate,
  staffController.createStaff,
);
router.put(
  "/vendors/:vendorId/staff/:staffId",
  authenticate,
  staffController.updateStaff,
);
router.delete(
  "/vendors/:vendorId/staff/:staffId",
  authenticate,
  staffController.deleteStaff,
);
router.patch(
  "/vendors/:vendorId/staff/:staffId/toggle-status",
  authenticate,
  staffController.toggleStaffStatus,
);

module.exports = router;
