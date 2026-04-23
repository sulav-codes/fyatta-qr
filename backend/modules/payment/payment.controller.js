const paymentService = require("./payment.service");
const { sendControllerError } = require("../../utils/controllerError");
const logger = require("../../config/logger");

exports.initiateEsewaPayment = async (req, res) => {
  try {
    const response = await paymentService.initiateEsewaPayment({
      orderId: req.body.orderId,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "[eSewa] Error initiating payment:",
      fallbackMessage: "Failed to initiate payment",
    });
  }
};

exports.verifyEsewaPayment = async (req, res) => {
  try {
    const redirectUrl = await paymentService.verifyEsewaPayment({
      dataParam: req.query.data,
    });

    return res.redirect(redirectUrl);
  } catch (error) {
    logger.error("[eSewa] Error verifying payment", {
      module: "payment-controller",
      error,
    });

    return res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:3000"}/payment-result?status=failed&reason=server-error`,
    );
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const response = await paymentService.getPaymentStatus({
      orderId: req.params.orderId,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "[Payment] Error getting payment status:",
      fallbackMessage: "Failed to get payment status",
    });
  }
};

module.exports = exports;
