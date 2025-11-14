const express = require("express");
const router = express.Router();
const { authenticate, optionalAuth } = require("../middleware/auth");
const orderController = require("../controllers/orderController");

// Protected routes - require authentication
router.get(
  "/vendors/:vendorId/orders",
  authenticate,
  orderController.getOrders
);

// Public customer order creation endpoint - no authentication required
router.post("/customer/orders", orderController.createCustomerOrder);

// Public customer order details endpoint - no authentication required
router.get(
  "/customer/orders/:orderId",
  orderController.getCustomerOrderDetails
);

// Protected vendor order creation
router.post("/orders", authenticate, orderController.createOrder);
router.get("/orders/:orderId", orderController.getOrderDetails);
router.patch(
  "/orders/:orderId/status",
  authenticate,
  orderController.updateOrderStatus
);
router.patch(
  "/orders/:orderId/payment",
  authenticate,
  orderController.updatePaymentStatus
);
router.post(
  "/orders/:orderId/resolve-issue",
  authenticate,
  orderController.resolveDeliveryIssue
);

// Public/semi-public routes for customers
router.post(
  "/orders/:orderId/report-issue",
  orderController.reportDeliveryIssue
);
router.post("/orders/:orderId/verify", orderController.verifyDelivery);

module.exports = router;
