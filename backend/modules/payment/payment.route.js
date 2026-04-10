const express = require("express");
const router = express.Router();
const { validate } = require("../../middlewares/validate.middleware");
const paymentController = require("./payment.controller");
const paymentValidation = require("./payment.validation");

// Initiate eSewa payment
router.post(
  "/esewa/initiate",
  validate({ body: paymentValidation.initiateEsewaPaymentBodySchema }),
  paymentController.initiateEsewaPayment,
);

// Verify eSewa payment (callback from eSewa)
router.get(
  "/esewa/verify",
  validate({ query: paymentValidation.verifyEsewaPaymentQuerySchema }),
  paymentController.verifyEsewaPayment,
);

// Get payment status
router.get(
  "/status/:orderId",
  validate({ params: paymentValidation.paymentStatusParamsSchema }),
  paymentController.getPaymentStatus,
);

module.exports = router;
