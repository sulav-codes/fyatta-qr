const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const tableController = require("./table.controller");

// Public route - no auth required (for QR code scanning)
router.get(
  "/public-table/:vendorId/:tableIdentifier/status",
  tableController.getTableStatus,
);
router.get(
  "/public-table/:vendorId/:tableIdentifier",
  tableController.getTableStatus,
);

// Protected routes - require authentication
router.get(
  "/vendors/:vendorId/tables",
  authenticate,
  tableController.getTables,
);
router.post(
  "/vendors/:vendorId/tables",
  authenticate,
  tableController.createTable,
);
router.get(
  "/vendors/:vendorId/tables/:tableId",
  authenticate,
  tableController.getTableDetails,
);
router.put(
  "/vendors/:vendorId/tables/:tableId",
  authenticate,
  tableController.updateTable,
);
router.delete(
  "/vendors/:vendorId/tables/:tableId",
  authenticate,
  tableController.deleteTable,
);
router.post(
  "/vendors/:vendorId/tables/:tableId/regenerate-qr",
  authenticate,
  tableController.regenerateQRCode,
);

module.exports = router;
