const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

// Initiate eSewa payment
router.post("/esewa/initiate", paymentController.initiateEsewaPayment);

// Verify eSewa payment (callback from eSewa)
router.get("/esewa/verify", paymentController.verifyEsewaPayment);

// Get payment status
router.get("/status/:orderId", paymentController.getPaymentStatus);

module.exports = router;
