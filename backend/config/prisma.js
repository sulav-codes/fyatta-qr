import { PrismaClient } from "@prisma/client";
import logger from "./logger.js";

// Initialize Prisma Client for Supabase
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

// Test database connection
(async () => {
  try {
    await prisma.$connect();
    logger.info("Connected to Supabase PostgreSQL via Prisma");
  } catch (error) {
    logger.error("Supabase connection failed", {
      error,
      hint: "Check your DATABASE_URL and DIRECT_URL in .env",
    });
    process.exit(1);
  }
})();

let isShuttingDown = false;
let httpServer = null;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, shutting down...`);

  const timeout = setTimeout(() => {
    logger.error("Shutdown timeout, forcing exit");
    process.exit(1);
  }, 10000);

  try {
    // Close server
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
      logger.info("HTTP server closed");
    }

    // Disconnect Prisma
    await prisma.$disconnect();
    logger.info("Prisma disconnected");

    clearTimeout(timeout);
    process.exit(0);
  } catch (error) {
    logger.error("Shutdown error", { error });
    clearTimeout(timeout);
    process.exit(1);
  }
};

const registerServer = (server) => {
  httpServer = server;
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default prisma;
export { registerServer };
