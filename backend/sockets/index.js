import { createSocketServer } from "./socket.server.js";
import {
  emitOrderCreated,
  emitOrderStatusChanged,
  emitOrderStatusUpdate,
  emitDeliveryIssue,
  emitOrderVerified,
  emitVendorNotification,
} from "./order.socket.js";
import { emitToRoom, emitToVendor, emitToTable } from "./notifier.js";

const socketApi = {
  createSocketServer,
  emitOrderCreated,
  emitOrderStatusChanged,
  emitOrderStatusUpdate,
  emitDeliveryIssue,
  emitOrderVerified,
  emitVendorNotification,
  emitToRoom,
  emitToVendor,
  emitToTable,
};

export {
  createSocketServer,
  emitOrderCreated,
  emitOrderStatusChanged,
  emitOrderStatusUpdate,
  emitDeliveryIssue,
  emitOrderVerified,
  emitVendorNotification,
  emitToRoom,
  emitToVendor,
  emitToTable,
};

export default socketApi;
