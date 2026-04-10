const express = require("express");
const router = express.Router();
const { validate } = require("../../middlewares/validate.middleware");
const notificationValidation = require("./notification.validation");
const notificationController = require("./notification.controller");

// Call waiter endpoint
router.post(
  "/call-waiter",
  validate({ body: notificationValidation.callWaiterBodySchema }),
  notificationController.callWaiter,
);

module.exports = router;
