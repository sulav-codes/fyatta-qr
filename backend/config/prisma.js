const { PrismaClient } = require("@prisma/client");
const logger = require("./logger");

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

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
  logger.info("Prisma disconnected on beforeExit");
});

// Handle unexpected disconnections
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  logger.info("Prisma disconnected on SIGINT");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  logger.info("Prisma disconnected on SIGTERM");
  process.exit(0);
});

module.exports = prisma;
