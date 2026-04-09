const { getSocketServer } = require("./socket.store");
const { vendorRoom, tableRoom } = require("./rooms");

function emitToRoom(room, event, payload) {
  const io = getSocketServer();

  if (!io || !room || !event) {
    return false;
  }

  io.to(room).emit(event, payload);
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
