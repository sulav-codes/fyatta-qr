const SOCKET_EVENTS = Object.freeze({
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  JOIN_VENDOR: "join-vendor",
  LEAVE_VENDOR: "leave-vendor",
  JOIN_TABLE: "join-table",
  LEAVE_TABLE: "leave-table",
  ORDER_CREATED: "order-created",
  ORDER_STATUS_CHANGED: "order-status-changed",
  ORDER_STATUS_UPDATE: "order-status-update",
  DELIVERY_ISSUE: "delivery-issue",
  ORDER_VERIFIED: "order-verified",
  NOTIFICATION: "notification",
});

module.exports = {
  SOCKET_EVENTS,
};
