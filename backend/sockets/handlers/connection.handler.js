const { SOCKET_EVENTS } = require("../events");
const { vendorRoom, tableRoom } = require("../rooms");

function registerConnectionHandler(io) {
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    socket.on(SOCKET_EVENTS.JOIN_VENDOR, (vendorId) => {
      const room = vendorRoom(vendorId);
      if (room) {
        socket.join(room);
      }
    });

    socket.on(
      SOCKET_EVENTS.JOIN_TABLE,
      ({ vendorId, tableIdentifier } = {}) => {
        const room = tableRoom(vendorId, tableIdentifier);
        if (room) {
          socket.join(room);
        }
      },
    );

    socket.on(SOCKET_EVENTS.LEAVE_VENDOR, (vendorId) => {
      const room = vendorRoom(vendorId);
      if (room) {
        socket.leave(room);
      }
    });

    socket.on(
      SOCKET_EVENTS.LEAVE_TABLE,
      ({ vendorId, tableIdentifier } = {}) => {
        const room = tableRoom(vendorId, tableIdentifier);
        if (room) {
          socket.leave(room);
        }
      },
    );
  });
}

module.exports = {
  registerConnectionHandler,
};
