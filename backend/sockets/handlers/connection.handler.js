import { SOCKET_EVENTS } from "../events.js";
import { vendorRoom, tableRoom } from "../rooms.js";
import logger from "../../config/logger.js";

function registerConnectionHandler(io) {
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    logger.info("Socket client connected", {
      module: "socket-connection",
      socketId: socket.id,
    });

    socket.on(SOCKET_EVENTS.JOIN_VENDOR, (vendorId) => {
      const room = vendorRoom(vendorId);

      if (room) {
        socket.join(room);
        logger.info("Socket joined vendor room", {
          module: "socket-connection",
          socketId: socket.id,
          vendorId,
          room,
        });
        return;
      }

      logger.warn("Socket vendor join ignored: invalid room", {
        module: "socket-connection",
        socketId: socket.id,
        vendorId,
      });
    });

    socket.on(
      SOCKET_EVENTS.JOIN_TABLE,
      ({ vendorId, tableIdentifier } = {}) => {
        const room = tableRoom(vendorId, tableIdentifier);

        if (room) {
          socket.join(room);
          logger.info("Socket joined table room", {
            module: "socket-connection",
            socketId: socket.id,
            vendorId,
            tableIdentifier,
            room,
          });
          return;
        }

        logger.warn("Socket table join ignored: invalid room", {
          module: "socket-connection",
          socketId: socket.id,
          vendorId,
          tableIdentifier,
        });
      },
    );

    socket.on(SOCKET_EVENTS.LEAVE_VENDOR, (vendorId) => {
      const room = vendorRoom(vendorId);

      if (room) {
        socket.leave(room);
        logger.info("Socket left vendor room", {
          module: "socket-connection",
          socketId: socket.id,
          vendorId,
          room,
        });
        return;
      }

      logger.warn("Socket vendor leave ignored: invalid room", {
        module: "socket-connection",
        socketId: socket.id,
        vendorId,
      });
    });

    socket.on(
      SOCKET_EVENTS.LEAVE_TABLE,
      ({ vendorId, tableIdentifier } = {}) => {
        const room = tableRoom(vendorId, tableIdentifier);

        if (room) {
          socket.leave(room);
          logger.info("Socket left table room", {
            module: "socket-connection",
            socketId: socket.id,
            vendorId,
            tableIdentifier,
            room,
          });
          return;
        }

        logger.warn("Socket table leave ignored: invalid room", {
          module: "socket-connection",
          socketId: socket.id,
          vendorId,
          tableIdentifier,
        });
      },
    );

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      logger.info("Socket client disconnected", {
        module: "socket-connection",
        socketId: socket.id,
        reason,
      });
    });
  });
}

export { registerConnectionHandler };
