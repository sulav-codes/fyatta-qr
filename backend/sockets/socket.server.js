const { Server } = require("socket.io");
const { setSocketServer } = require("./socket.store");
const { registerConnectionHandler } = require("./handlers/connection.handler");
const logger = require("../config/logger");

function createSocketServer(server, options = {}) {
  const corsOrigin =
    options.corsOrigin ||
    process.env.CLIENT_URL ||
    "https://fyatta-qr.vercel.app";

  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  setSocketServer(io);
  registerConnectionHandler(io);

  logger.info("Socket server initialized", {
    module: "socket-server",
    corsOrigin,
  });

  return io;
}

module.exports = {
  createSocketServer,
};
