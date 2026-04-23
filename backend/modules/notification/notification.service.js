const prisma = require("../../config/prisma");
const { emitVendorNotification } = require("../../sockets/order.socket");
const { emitToVendor } = require("../../sockets/notifier");
const logger = require("../../config/logger");
const { ServiceError } = require("../../utils/serviceError");
const { validatePayload } = require("../../utils/serviceValidation");
const notificationValidation = require("./notification.validation");

const callWaiter = async ({ body }) => {
  const { vendor_id, table_identifier, table_name } = validatePayload(
    notificationValidation.callWaiterBodySchema,
    body || {},
    { part: "body" },
  );
  const vendorId = Number.parseInt(String(vendor_id), 10);

  if (Number.isNaN(vendorId)) {
    throw new ServiceError("Vendor ID must be a valid number", { status: 400 });
  }

  logger.info("[Waiter Call] Request received", {
    module: "notification-service",
    vendorId,
    tableIdentifier: table_identifier,
    tableName: table_name || null,
  });

  const vendor = await prisma.user.findUnique({
    where: { id: vendorId },
    select: { id: true, email: true, restaurantName: true },
  });

  if (!vendor) {
    throw new ServiceError("Vendor not found", { status: 404 });
  }

  const table = await prisma.table.findFirst({
    where: {
      vendorId,
      qrCode: table_identifier,
    },
    select: { id: true, name: true },
  });

  const tableName = table ? table.name : table_name || "Unknown Table";

  const timestamp = new Date().toISOString();
  const notificationData = {
    vendor_id: vendor.id,
    table_identifier,
    table_name: tableName,
    timestamp,
    type: "waiter_call",
  };

  try {
    const payload = {
      type: "waiter_call",
      data: notificationData,
      message: `Customer at ${tableName} is calling for assistance`,
    };

    const didEmitNotification = emitVendorNotification(vendorId, payload);
    const didEmitLegacy = emitToVendor(vendorId, `vendor-${vendorId}`, payload);
    const didEmit = didEmitNotification || didEmitLegacy;

    if (didEmit) {
      logger.info("[Waiter Call] Socket notification sent", {
        module: "notification-service",
        room: `vendor-${vendorId}`,
      });
    } else {
      logger.warn("[Waiter Call] Socket.io not available", {
        module: "notification-service",
        vendorId,
      });
    }
  } catch (socketError) {
    logger.error("[Waiter Call] Socket error", {
      module: "notification-service",
      error: socketError,
      vendorId,
    });
  }

  logger.info("[Waiter Call] Waiter notified", {
    module: "notification-service",
    tableName,
    restaurantName: vendor.restaurantName,
    vendorId,
  });

  return {
    success: true,
    message: "Waiter has been notified",
    data: notificationData,
  };
};

module.exports = {
  callWaiter,
};
