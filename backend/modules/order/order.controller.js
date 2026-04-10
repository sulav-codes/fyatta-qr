const orderService = require("./order.service");
const { sendControllerError } = require("../../utils/controllerError");

exports.getOrders = async (req, res) => {
  try {
    const response = await orderService.getOrders({
      vendorId: req.params.vendorId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "[getOrders] Error fetching orders:",
      fallbackMessage: "Failed to fetch orders",
    });
  }
};

exports.createCustomerOrder = async (req, res) => {
  try {
    const response = await orderService.createCustomerOrder({
      body: req.body,
    });

    res.status(201).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error creating customer order:",
      fallbackMessage: "Failed to create order",
    });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const response = await orderService.createOrder({
      body: req.body,
      user: req.user,
    });

    res.status(201).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error creating order:",
      fallbackMessage: "Failed to create order",
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const response = await orderService.updateOrderStatus({
      orderId: req.params.orderId,
      body: req.body,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    if (
      error?.status === 400 &&
      error?.message === "Invalid status" &&
      error?.details?.validStatuses
    ) {
      return res.status(400).json({
        error: error.message,
        validStatuses: error.details.validStatuses,
      });
    }

    sendControllerError(res, error, {
      logPrefix: "Error updating order status:",
      fallbackMessage: "Failed to update order status",
    });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const response = await orderService.getOrderDetails({
      orderId: req.params.orderId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error fetching order details:",
      fallbackMessage: "Failed to fetch order details",
    });
  }
};

exports.getCustomerOrderDetails = async (req, res) => {
  try {
    const response = await orderService.getCustomerOrderDetails({
      orderId: req.params.orderId,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error fetching customer order details:",
      fallbackMessage: "Failed to fetch order details",
    });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const response = await orderService.updatePaymentStatus({
      orderId: req.params.orderId,
      body: req.body,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error updating payment status:",
      fallbackMessage: "Failed to update payment status",
    });
  }
};

exports.reportDeliveryIssue = async (req, res) => {
  try {
    const response = await orderService.reportDeliveryIssue({
      orderId: req.params.orderId,
      body: req.body,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error reporting delivery issue:",
      fallbackMessage: "Failed to report delivery issue",
    });
  }
};

exports.resolveDeliveryIssue = async (req, res) => {
  try {
    const response = await orderService.resolveDeliveryIssue({
      orderId: req.params.orderId,
      body: req.body,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error resolving delivery issue:",
      fallbackMessage: "Failed to resolve delivery issue",
    });
  }
};

exports.verifyDelivery = async (req, res) => {
  try {
    const response = await orderService.verifyDelivery({
      orderId: req.params.orderId,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error verifying delivery:",
      fallbackMessage: "Failed to verify delivery",
    });
  }
};

module.exports = exports;
