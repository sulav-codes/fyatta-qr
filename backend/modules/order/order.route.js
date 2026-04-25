import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import validateMiddleware from "../../middlewares/validate.middleware.js";
import rateLimiter from "../../middlewares/rateLimiter.js";
import * as orderController from "./order.controller.js";
import * as orderValidation from "./order.validation.js";

const router = Router();
const { authenticate } = authMiddleware;
const { validate } = validateMiddleware;
const { publicWriteLimiter } = rateLimiter;

// Protected route for vendors to get their orders
router.get(
  "/vendors/:vendorId/orders",
  authenticate,
  validate({ params: orderValidation.vendorParamsSchema }),
  orderController.getOrders,
);

// Public customer order creation endpoint - no authentication required
router.post(
  "/customer/orders",
  publicWriteLimiter,
  validate({ body: orderValidation.createCustomerOrderBodySchema }),
  orderController.createCustomerOrder,
);

// Public customer order details endpoint - no authentication required
router.get(
  "/customer/orders/:orderId",
  validate({ params: orderValidation.orderParamsSchema }),
  orderController.getCustomerOrderDetails,
);

// Protected vendor order creation
router.post(
  "/orders",
  authenticate,
  validate({ body: orderValidation.createOrderBodySchema }),
  orderController.createOrder,
);
router.get(
  "/orders/:orderId",
  validate({ params: orderValidation.orderParamsSchema }),
  orderController.getOrderDetails,
);
router.patch(
  "/orders/:orderId/status",
  authenticate,
  validate({
    params: orderValidation.orderParamsSchema,
    body: orderValidation.updateOrderStatusBodySchema,
  }),
  orderController.updateOrderStatus,
);
router.patch(
  "/orders/:orderId/payment",
  authenticate,
  validate({
    params: orderValidation.orderParamsSchema,
    body: orderValidation.updatePaymentStatusBodySchema,
  }),
  orderController.updatePaymentStatus,
);
router.post(
  "/orders/:orderId/resolve-issue",
  authenticate,
  validate({
    params: orderValidation.orderParamsSchema,
    body: orderValidation.resolveDeliveryIssueBodySchema,
  }),
  orderController.resolveDeliveryIssue,
);

// Public/semi-public routes for customers
router.post(
  "/orders/:orderId/report-issue",
  publicWriteLimiter,
  validate({
    params: orderValidation.orderParamsSchema,
    body: orderValidation.reportDeliveryIssueBodySchema,
  }),
  orderController.reportDeliveryIssue,
);
router.post(
  "/orders/:orderId/verify",
  publicWriteLimiter,
  validate({ params: orderValidation.orderParamsSchema }),
  orderController.verifyDelivery,
);

export default router;
