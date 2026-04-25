import { Router } from "express";
import validateMiddleware from "../../middlewares/validate.middleware.js";
import rateLimiter from "../../middlewares/rateLimiter.js";
import * as notificationValidation from "./notification.validation.js";
import * as notificationController from "./notification.controller.js";

const router = Router();
const { validate } = validateMiddleware;
const { waiterCallLimiter } = rateLimiter;

// Call waiter endpoint
router.post(
  "/call-waiter",
  waiterCallLimiter,
  validate({ body: notificationValidation.callWaiterBodySchema }),
  notificationController.callWaiter,
);

export default router;
