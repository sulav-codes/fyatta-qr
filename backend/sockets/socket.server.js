import { Server } from "socket.io";
import { setSocketServer } from "./socket.store.js";
import { registerConnectionHandler } from "./handlers/connection.handler.js";
import logger from "../config/logger.js";

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

export { createSocketServer };
