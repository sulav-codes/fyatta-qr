const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const tableController = require("../controllers/tableController");

// Public route - no auth required (for QR code scanning)
router.get(
  "/vendors/:vendorId/tables/:tableIdentifier/status",
  tableController.getTableStatus
);

// Protected routes - require authentication
router.use(authenticate);

router.get("/vendors/:vendorId/tables", tableController.getTables);
router.post("/vendors/:vendorId/tables", tableController.createTable);
router.get(
  "/vendors/:vendorId/tables/:tableId",
  tableController.getTableDetails
);
router.put("/vendors/:vendorId/tables/:tableId", tableController.updateTable);
router.delete(
  "/vendors/:vendorId/tables/:tableId",
  tableController.deleteTable
);
router.post(
  "/vendors/:vendorId/tables/:tableId/regenerate-qr",
  tableController.regenerateQRCode
);

module.exports = router;
