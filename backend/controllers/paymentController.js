const crypto = require("crypto");
const { orders, orderItems, menuItems, users } = require("../models/index");

// eSewa Configuration
const ESEWA_CONFIG = {
  SECRET_KEY: "8gBm/:&EnhH.1/q",
  PRODUCT_CODE: "EPAYTEST",
  SUCCESS_URL:
    process.env.ESEWA_SUCCESS_URL ||
    "http://localhost:8000/api/payment/esewa/verify",
  FAILURE_URL:
    process.env.ESEWA_FAILURE_URL ||
    "http://localhost:8000/api/payment/esewa/verify",
  PAYMENT_URL:
    process.env.ESEWA_PAYMENT_URL ||
    "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
};

/**
 * Generate eSewa signature
 */
function generateEsewaSignature(totalAmount, transactionUuid, productCode) {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

  console.log("[eSewa] Signature message:", message);
  console.log("[eSewa] Secret key:", ESEWA_CONFIG.SECRET_KEY);

  const hash = crypto
    .createHmac("sha256", ESEWA_CONFIG.SECRET_KEY)
    .update(message)
    .digest("base64");

  console.log("[eSewa] Generated signature:", hash);

  return hash;
}

/**
 * Verify eSewa signature
 */
function verifyEsewaSignature(
  paymentData,
  receivedSignature,
  signedFieldNames
) {
  try {
    const fieldList = signedFieldNames.split(",");
    const messageParts = [];

    for (const field of fieldList) {
      const value = paymentData[field] || "";
      messageParts.push(`${field}=${value}`);
    }

    const message = messageParts.join(",");

    console.log("[eSewa] Verification message:", message);

    const calculatedSignature = crypto
      .createHmac("sha256", ESEWA_CONFIG.SECRET_KEY)
      .update(message)
      .digest("base64");

    console.log("[eSewa] Calculated signature:", calculatedSignature);
    console.log("[eSewa] Received signature:", receivedSignature);

    return receivedSignature === calculatedSignature;
  } catch (error) {
    console.error("[eSewa] Error verifying signature:", error);
    return false;
  }
}

/**
 * Initiate eSewa payment for an order
 */
exports.initiateEsewaPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    // Get the order
    const order = await orders.findByPk(orderId, {
      include: [
        {
          model: users,
          as: "vendor",
          attributes: ["id", "username", "email"],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Generate signature
    const totalAmount = parseFloat(order.totalAmount).toFixed(2);
    const transactionUuid = order.invoiceNo;
    const signature = generateEsewaSignature(
      totalAmount,
      transactionUuid,
      ESEWA_CONFIG.PRODUCT_CODE
    );

    // Prepare payment data
    const paymentData = {
      amount: totalAmount,
      tax_amount: "0",
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_CONFIG.PRODUCT_CODE,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: ESEWA_CONFIG.SUCCESS_URL,
      failure_url: ESEWA_CONFIG.FAILURE_URL,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature: signature,
      order_id: order.id,
    };

    console.log("[eSewa] Payment initiation data:", paymentData);

    res.status(200).json({
      success: true,
      paymentUrl: ESEWA_CONFIG.PAYMENT_URL,
      paymentData,
      orderId: order.id,
      invoiceNo: transactionUuid,
    });
  } catch (error) {
    console.error("[eSewa] Error initiating payment:", error);
    res.status(500).json({
      error: "Failed to initiate payment",
      details: error.message,
    });
  }
};

/**
 * Verify eSewa payment
 */
exports.verifyEsewaPayment = async (req, res) => {
  try {
    console.log("[eSewa] Payment verification received");
    console.log("[eSewa] Query params:", req.query);
    console.log("[eSewa] Body:", req.body);

    // eSewa sends data as base64 encoded in GET parameter
    const dataParam = req.query.data;

    if (!dataParam) {
      console.error("[eSewa] Missing data parameter");
      return res.redirect(
        `${
          process.env.CLIENT_URL || "http://localhost:3000"
        }/payment-result?status=failed&reason=missing-data`
      );
    }

    // Decode base64 data
    let paymentData;
    try {
      const decodedBytes = Buffer.from(dataParam, "base64");
      paymentData = JSON.parse(decodedBytes.toString("utf-8"));
      console.log("[eSewa] Decoded payment data:", paymentData);
    } catch (error) {
      console.error("[eSewa] Error decoding payment data:", error);
      return res.redirect(
        `${
          process.env.CLIENT_URL || "http://localhost:3000"
        }/payment-result?status=failed&reason=decode-error`
      );
    }

    // Extract fields
    const transactionUuid = paymentData.transaction_uuid;
    const status = paymentData.status;
    const totalAmount = paymentData.total_amount;
    const transactionCode = paymentData.transaction_code;
    const receivedSignature = paymentData.signature;
    const signedFieldNames = paymentData.signed_field_names || "";

    // Verify signature if present
    if (receivedSignature && signedFieldNames) {
      const isValid = verifyEsewaSignature(
        paymentData,
        receivedSignature,
        signedFieldNames
      );
      if (!isValid) {
        console.warn("[eSewa] Signature verification failed");
        return res.redirect(
          `${
            process.env.CLIENT_URL || "http://localhost:3000"
          }/payment-result?status=failed&reason=invalid-signature`
        );
      }
    }

    // Find order by invoice number
    const order = await orders.findOne({
      where: { invoiceNo: transactionUuid },
      include: [{ model: users, as: "vendor" }],
    });

    if (!order) {
      console.error("[eSewa] Order not found:", transactionUuid);
      return res.redirect(
        `${
          process.env.CLIENT_URL || "http://localhost:3000"
        }/payment-result?status=failed&reason=order-not-found&invoice_no=${transactionUuid}`
      );
    }

    // Check payment status
    if (status !== "COMPLETE") {
      if (status === "PENDING") {
        await order.update({ paymentStatus: "pending" });
        console.log("[eSewa] Payment pending for order:", order.id);
        return res.redirect(
          `${
            process.env.CLIENT_URL || "http://localhost:3000"
          }/payment-result?status=pending&invoice_no=${transactionUuid}`
        );
      }

      console.warn("[eSewa] Payment failed with status:", status);
      return res.redirect(
        `${
          process.env.CLIENT_URL || "http://localhost:3000"
        }/payment-result?status=failed&invoice_no=${transactionUuid}`
      );
    }

    // Verify amount
    const formattedTotalAmount = totalAmount.replace(",", "");
    if (
      Math.abs(
        parseFloat(formattedTotalAmount) - parseFloat(order.totalAmount)
      ) > 0.01
    ) {
      console.warn(
        `[eSewa] Amount mismatch: expected ${order.totalAmount}, got ${formattedTotalAmount}`
      );
      return res.redirect(
        `${
          process.env.CLIENT_URL || "http://localhost:3000"
        }/payment-result?status=failed&reason=amount-mismatch&invoice_no=${transactionUuid}`
      );
    }

    // Update order
    const oldStatus = order.status;
    await order.update({
      paymentStatus: "paid",
      status: "confirmed",
      paymentMethod: "esewa",
      transactionId: transactionCode,
    });

    console.log(
      `[eSewa] Order ${order.id} payment verified. Transaction: ${transactionCode}`
    );

    // Emit socket events
    const io = req.app.get("io");
    if (io) {
      // Notify vendor
      io.to(`vendor-${order.vendorId}`).emit("order-status-changed", {
        orderId: order.id,
        oldStatus,
        newStatus: "confirmed",
      });

      io.to(`vendor-${order.vendorId}`).emit("notification", {
        id: `order-${order.id}-payment`,
        type: "payment",
        title: "Payment Received",
        message: `Payment received for order #${order.id} via eSewa`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        read: false,
        data: {
          order_id: order.id,
          transaction_code: transactionCode,
          payment_method: "esewa",
          amount: order.totalAmount,
        },
      });

      // Send new order notification
      io.to(`vendor-${order.vendorId}`).emit("order-created", {
        orderId: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        tableIdentifier: order.tableIdentifier,
      });
    }

    // Redirect to success page
    return res.redirect(
      `${
        process.env.CLIENT_URL || "http://localhost:3000"
      }/payment-result?status=success&orderId=${
        order.id
      }&invoice_no=${transactionUuid}`
    );
  } catch (error) {
    console.error("[eSewa] Error verifying payment:", error);
    return res.redirect(
      `${
        process.env.CLIENT_URL || "http://localhost:3000"
      }/payment-result?status=failed&reason=server-error`
    );
  }
};

/**
 * Get payment status for an order
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await orders.findByPk(orderId, {
      attributes: [
        "id",
        "invoiceNo",
        "paymentStatus",
        "paymentMethod",
        "transactionId",
        "totalAmount",
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      orderId: order.id,
      invoiceNo: order.invoiceNo,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      transactionId: order.transactionId,
      totalAmount: order.totalAmount,
    });
  } catch (error) {
    console.error("[Payment] Error getting payment status:", error);
    res.status(500).json({
      error: "Failed to get payment status",
      details: error.message,
    });
  }
};

module.exports = exports;
