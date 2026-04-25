import { Router } from "express";
import validateMiddleware from "../../middlewares/validate.middleware.js";
import rateLimiter from "../../middlewares/rateLimiter.js";
import * as paymentController from "./payment.controller.js";
import * as paymentValidation from "./payment.validation.js";

const router = Router();
const { validate } = validateMiddleware;
const { paymentLimiter } = rateLimiter;

// Initiate eSewa payment
router.post(
  "/esewa/initiate",
  paymentLimiter,
  validate({ body: paymentValidation.initiateEsewaPaymentBodySchema }),
  paymentController.initiateEsewaPayment,
);

// Verify eSewa payment (callback from eSewa)
router.get(
  "/esewa/verify",
  paymentLimiter,
  validate({ query: paymentValidation.verifyEsewaPaymentQuerySchema }),
  paymentController.verifyEsewaPayment,
);

// Get payment status
router.get(
  "/status/:orderId",
  paymentLimiter,
  validate({ params: paymentValidation.paymentStatusParamsSchema }),
  paymentController.getPaymentStatus,
);

export default router;
