import orderService from "./order.service.js";
import { sendControllerError } from "../../utils/controllerError.js";

const getOrders = async (req, res) => {
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

const createCustomerOrder = async (req, res) => {
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

const createOrder = async (req, res) => {
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

const updateOrderStatus = async (req, res) => {
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

const getOrderDetails = async (req, res) => {
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

const getCustomerOrderDetails = async (req, res) => {
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

const updatePaymentStatus = async (req, res) => {
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

const reportDeliveryIssue = async (req, res) => {
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

const resolveDeliveryIssue = async (req, res) => {
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

const verifyDelivery = async (req, res) => {
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

export {
  getOrders,
  createCustomerOrder,
  createOrder,
  updateOrderStatus,
  getOrderDetails,
  getCustomerOrderDetails,
  updatePaymentStatus,
  reportDeliveryIssue,
  resolveDeliveryIssue,
  verifyDelivery,
};
