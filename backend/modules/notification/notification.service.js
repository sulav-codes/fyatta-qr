const prisma = require("../../config/prisma");
const { emitVendorNotification } = require("../../sockets/order.socket");
const { emitToVendor } = require("../../sockets/notifier");
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

  console.log("[Waiter Call] Request received:", {
    vendor_id,
    table_identifier,
    table_name,
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
      console.log(
        `[Waiter Call] Socket notification sent to vendor-${vendorId}`,
      );
    } else {
      console.warn(
        "[Waiter Call] Socket.io not available, notification not sent via socket",
      );
    }
  } catch (socketError) {
    console.error("[Waiter Call] Socket error:", socketError);
  }

  console.log(
    `[Waiter Call] ${tableName} called waiter at ${vendor.restaurantName}`,
  );

  return {
    success: true,
    message: "Waiter has been notified",
    data: notificationData,
  };
};

module.exports = {
  callWaiter,
};
