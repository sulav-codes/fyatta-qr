const express = require("express");
const router = express.Router();
const { validate } = require("../../middlewares/validate.middleware");
const { waiterCallLimiter } = require("../../middlewares/rateLimiter");
const notificationValidation = require("./notification.validation");
const notificationController = require("./notification.controller");

// Call waiter endpoint
router.post(
  "/call-waiter",
  waiterCallLimiter,
  validate({ body: notificationValidation.callWaiterBodySchema }),
  notificationController.callWaiter,
);

module.exports = router;
