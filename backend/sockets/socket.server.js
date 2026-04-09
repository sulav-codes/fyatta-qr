const { Server } = require("socket.io");
const { setSocketServer } = require("./socket.store");
const { registerConnectionHandler } = require("./handlers/connection.handler");

function createSocketServer(server, options = {}) {
  const io = new Server(server, {
    cors: {
      origin:
        options.corsOrigin ||
        process.env.CLIENT_URL ||
        "https://fyatta-qr.vercel.app",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  setSocketServer(io);
  registerConnectionHandler(io);

  return io;
}

module.exports = {
  createSocketServer,
};
