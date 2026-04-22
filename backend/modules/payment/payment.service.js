const crypto = require("crypto");
const prisma = require("../../config/prisma");
const {
  emitOrderStatusChanged,
  emitOrderCreated,
  emitVendorNotification,
} = require("../../sockets/order.socket");
const { ServiceError } = require("../../utils/serviceError");
const { validatePayload } = require("../../utils/serviceValidation");
const paymentValidation = require("./payment.validation");

const ESEWA_CONFIG = {
  SECRET_KEY: process.env.ESEWA_SECRET_KEY,
  PRODUCT_CODE: process.env.ESEWA_PRODUCT_CODE,
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

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const buildClientRedirect = (query) => {
  return `${CLIENT_URL}/payment-result?${query}`;
};

const generateEsewaSignature = (totalAmount, transactionUuid, productCode) => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

  return crypto
    .createHmac("sha256", ESEWA_CONFIG.SECRET_KEY)
    .update(message)
    .digest("base64");
};

const verifyEsewaSignature = (
  paymentData,
  receivedSignature,
  signedFieldNames,
) => {
  try {
    const fieldList = signedFieldNames.split(",");
    const message = fieldList
      .map((field) => `${field}=${paymentData[field] || ""}`)
      .join(",");

    const calculatedSignature = crypto
      .createHmac("sha256", ESEWA_CONFIG.SECRET_KEY)
      .update(message)
      .digest("base64");

    return receivedSignature === calculatedSignature;
  } catch (error) {
    console.error("[eSewa] Error verifying signature:", error);
    return false;
  }
};

const buildTransactionUuid = (orderId) => {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return `INV-${orderId}-${ts}-${rand}`;
};

const initiateEsewaPayment = async ({ orderId }) => {
  const { orderId: parsedOrderId } = validatePayload(
    paymentValidation.initiateEsewaPaymentBodySchema,
    { orderId },
    { part: "body" },
  );

  const order = await prisma.order.findUnique({
    where: { id: parsedOrderId },
    include: {
      vendor: {
        select: { id: true, username: true, email: true },
      },
    },
  });

  if (!order) {
    throw new ServiceError("Order not found", { status: 404 });
  }

  if (order.paymentStatus === "paid") {
    throw new ServiceError("Order is already paid", { status: 400 });
  }

  let transactionUuid;
  let updatedOrder;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      transactionUuid = buildTransactionUuid(order.id);
      updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { invoiceNo: transactionUuid },
      });
      break;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
    }
  }

  const totalAmount = Number(updatedOrder.totalAmount).toFixed(2);
  const signature = generateEsewaSignature(
    totalAmount,
    transactionUuid,
    ESEWA_CONFIG.PRODUCT_CODE,
  );

  return {
    success: true,
    paymentUrl: ESEWA_CONFIG.PAYMENT_URL,
    paymentData: {
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
      signature,
      order_id: order.id,
    },
    orderId: updatedOrder.id,
    invoiceNo: transactionUuid,
  };
};

const verifyEsewaPayment = async ({ dataParam }) => {
  ({ dataParam } = validatePayload(
    paymentValidation.verifyEsewaPaymentQuerySchema,
    { dataParam },
    { part: "query", prefs: { allowUnknown: true, stripUnknown: false } },
  ));

  if (!dataParam) {
    return buildClientRedirect("status=failed&reason=missing-data");
  }

  let paymentData;

  try {
    const decodedBytes = Buffer.from(dataParam, "base64");
    paymentData = JSON.parse(decodedBytes.toString("utf-8"));
  } catch (error) {
    console.error("[eSewa] Error decoding payment data:", error);
    return buildClientRedirect("status=failed&reason=decode-error");
  }

  const transactionUuid = paymentData.transaction_uuid;
  const status = paymentData.status;
  const totalAmount = paymentData.total_amount;
  const transactionCode = paymentData.transaction_code;
  const receivedSignature = paymentData.signature;
  const signedFieldNames = paymentData.signed_field_names || "";

  if (receivedSignature && signedFieldNames) {
    const isValid = verifyEsewaSignature(
      paymentData,
      receivedSignature,
      signedFieldNames,
    );

    if (!isValid) {
      return buildClientRedirect("status=failed&reason=invalid-signature");
    }
  }

  const order = await prisma.order.findFirst({
    where: { invoiceNo: transactionUuid },
    include: { vendor: true },
  });

  if (!order) {
    return buildClientRedirect(
      `status=failed&reason=order-not-found&invoice_no=${transactionUuid}`,
    );
  }

  if (status !== "COMPLETE") {
    if (status === "PENDING") {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "pending" },
      });

      return buildClientRedirect(
        `status=pending&invoice_no=${transactionUuid}`,
      );
    }

    return buildClientRedirect(`status=failed&invoice_no=${transactionUuid}`);
  }

  const formattedTotalAmount = String(totalAmount || "").replace(",", "");

  if (
    Math.abs(parseFloat(formattedTotalAmount) - parseFloat(order.totalAmount)) >
    0.01
  ) {
    return buildClientRedirect(
      `status=failed&reason=amount-mismatch&invoice_no=${transactionUuid}`,
    );
  }

  const oldStatus = order.status;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "paid",
      status: "confirmed",
      paymentMethod: "esewa",
      transactionId: transactionCode,
    },
  });

  emitOrderStatusChanged(order.vendorId, {
    orderId: order.id,
    oldStatus,
    newStatus: "confirmed",
  });

  emitVendorNotification(order.vendorId, {
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
      amount: Number(order.totalAmount),
    },
  });

  emitOrderCreated(order.vendorId, {
    orderId: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    tableIdentifier: order.tableIdentifier,
  });

  return buildClientRedirect(
    `status=success&orderId=${order.id}&invoice_no=${transactionUuid}`,
  );
};

const getPaymentStatus = async ({ orderId }) => {
  const { orderId: parsedOrderId } = validatePayload(
    paymentValidation.paymentStatusParamsSchema,
    { orderId },
    { part: "params" },
  );

  const order = await prisma.order.findUnique({
    where: { id: parsedOrderId },
    select: {
      id: true,
      invoiceNo: true,
      paymentStatus: true,
      paymentMethod: true,
      transactionId: true,
      totalAmount: true,
    },
  });

  if (!order) {
    throw new ServiceError("Order not found", { status: 404 });
  }

  return {
    orderId: order.id,
    invoiceNo: order.invoiceNo,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    transactionId: order.transactionId,
    totalAmount: Number(order.totalAmount),
  };
};

module.exports = {
  initiateEsewaPayment,
  verifyEsewaPayment,
  getPaymentStatus,
};
