const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { publicWriteLimiter } = require("../../middlewares/rateLimiter");
const orderController = require("./order.controller");
const orderValidation = require("./order.validation");

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

module.exports = router;
