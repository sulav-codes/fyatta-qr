const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const staffController = require("../controllers/staffController");

// All staff management routes require authentication
router.use(authenticate);

// Staff CRUD routes for vendors
router.get("/vendors/:vendorId/staff", staffController.getStaff);
router.get("/vendors/:vendorId/staff/:staffId", staffController.getStaffMember);
router.post("/vendors/:vendorId/staff", staffController.createStaff);
router.put("/vendors/:vendorId/staff/:staffId", staffController.updateStaff);
router.delete("/vendors/:vendorId/staff/:staffId", staffController.deleteStaff);
router.patch(
  "/vendors/:vendorId/staff/:staffId/toggle-status",
  staffController.toggleStaffStatus
);

module.exports = router;
