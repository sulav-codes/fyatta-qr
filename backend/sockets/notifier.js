const { getSocketServer } = require("./socket.store");
const { vendorRoom, tableRoom } = require("./rooms");
const logger = require("../config/logger");

function emitToRoom(room, event, payload) {
  const io = getSocketServer();

  if (!io || !room || !event) {
    logger.warn("Socket emit skipped due to invalid context", {
      module: "socket-notifier",
      hasIo: Boolean(io),
      room: room || null,
      event: event || null,
    });

    return false;
  }

  io.to(room).emit(event, payload);

  logger.debug("Socket event emitted", {
    module: "socket-notifier",
    room,
    event,
  });

  return true;
}

function emitToVendor(vendorId, event, payload) {
  return emitToRoom(vendorRoom(vendorId), event, payload);
}

function emitToTable(vendorId, tableIdentifier, event, payload) {
  return emitToRoom(tableRoom(vendorId, tableIdentifier), event, payload);
}

module.exports = {
  emitToRoom,
  emitToVendor,
  emitToTable,
};
