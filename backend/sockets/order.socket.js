const { SOCKET_EVENTS } = require("./events");
const { emitToVendor, emitToTable } = require("./notifier");
const logger = require("../config/logger");

function emitOrderCreated(vendorId, payload) {
  const didEmit = emitToVendor(vendorId, SOCKET_EVENTS.ORDER_CREATED, payload);

  if (!didEmit) {
    logger.warn("Failed to emit order-created event", {
      module: "order-socket",
      vendorId,
    });
    return false;
  }

  logger.debug("Emitted order-created event", {
    module: "order-socket",
    vendorId,
  });

  return true;
}

function emitOrderStatusChanged(vendorId, payload) {
  const didEmit = emitToVendor(
    vendorId,
    SOCKET_EVENTS.ORDER_STATUS_CHANGED,
    payload,
  );

  if (!didEmit) {
    logger.warn("Failed to emit order-status-changed event", {
      module: "order-socket",
      vendorId,
    });
    return false;
  }

  logger.debug("Emitted order-status-changed event", {
    module: "order-socket",
    vendorId,
  });

  return true;
}

function emitOrderStatusUpdate(vendorId, tableIdentifier, payload) {
  const didEmit = emitToTable(
    vendorId,
    tableIdentifier,
    SOCKET_EVENTS.ORDER_STATUS_UPDATE,
    payload,
  );

  if (!didEmit) {
    logger.warn("Failed to emit order-status-update event", {
      module: "order-socket",
      vendorId,
      tableIdentifier,
    });
    return false;
  }

  logger.debug("Emitted order-status-update event", {
    module: "order-socket",
    vendorId,
    tableIdentifier,
  });

  return true;
}

function emitDeliveryIssue(vendorId, payload) {
  const didEmit = emitToVendor(vendorId, SOCKET_EVENTS.DELIVERY_ISSUE, payload);

  if (!didEmit) {
    logger.warn("Failed to emit delivery-issue event", {
      module: "order-socket",
      vendorId,
    });
    return false;
  }

  logger.debug("Emitted delivery-issue event", {
    module: "order-socket",
    vendorId,
  });

  return true;
}

function emitOrderVerified(vendorId, payload) {
  const didEmit = emitToVendor(vendorId, SOCKET_EVENTS.ORDER_VERIFIED, payload);

  if (!didEmit) {
    logger.warn("Failed to emit order-verified event", {
      module: "order-socket",
      vendorId,
    });
    return false;
  }

  logger.debug("Emitted order-verified event", {
    module: "order-socket",
    vendorId,
  });

  return true;
}

function emitVendorNotification(vendorId, payload) {
  const didEmit = emitToVendor(vendorId, SOCKET_EVENTS.NOTIFICATION, payload);

  if (!didEmit) {
    logger.warn("Failed to emit vendor notification event", {
      module: "order-socket",
      vendorId,
    });
    return false;
  }

  logger.debug("Emitted vendor notification event", {
    module: "order-socket",
    vendorId,
  });

  return true;
}

module.exports = {
  emitOrderCreated,
  emitOrderStatusChanged,
  emitOrderStatusUpdate,
  emitDeliveryIssue,
  emitOrderVerified,
  emitVendorNotification,
};
