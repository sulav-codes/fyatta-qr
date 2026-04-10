const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const tableController = require("./table.controller");
const tableValidation = require("./table.validation");

// Public route - no auth required (for QR code scanning)
router.get(
  "/public-table/:vendorId/:tableIdentifier/status",
  validate({ params: tableValidation.tableStatusParamsSchema }),
  tableController.getTableStatus,
);
router.get(
  "/public-table/:vendorId/:tableIdentifier",
  validate({ params: tableValidation.tableStatusParamsSchema }),
  tableController.getTableStatus,
);

// Protected routes - require authentication
router.get(
  "/vendors/:vendorId/tables",
  authenticate,
  validate({ params: tableValidation.vendorParamsSchema }),
  tableController.getTables,
);
router.post(
  "/vendors/:vendorId/tables",
  authenticate,
  validate({
    params: tableValidation.vendorParamsSchema,
    body: tableValidation.createTableBodySchema,
  }),
  tableController.createTable,
);
router.get(
  "/vendors/:vendorId/tables/:tableId",
  authenticate,
  validate({ params: tableValidation.vendorTableParamsSchema }),
  tableController.getTableDetails,
);
router.put(
  "/vendors/:vendorId/tables/:tableId",
  authenticate,
  validate({
    params: tableValidation.vendorTableParamsSchema,
    body: tableValidation.updateTableBodySchema,
  }),
  tableController.updateTable,
);
router.delete(
  "/vendors/:vendorId/tables/:tableId",
  authenticate,
  validate({ params: tableValidation.vendorTableParamsSchema }),
  tableController.deleteTable,
);
router.post(
  "/vendors/:vendorId/tables/:tableId/regenerate-qr",
  authenticate,
  validate({ params: tableValidation.vendorTableParamsSchema }),
  tableController.regenerateQRCode,
);

module.exports = router;
