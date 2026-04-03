const { PrismaClient } = require("@prisma/client");

// Initialize Prisma Client for Supabase
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL, 
    },
  },
});

// Test database connection
(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Connected to Supabase PostgreSQL via Prisma");
  } catch (error) {
    console.error("❌ Supabase connection failed:", error.message);
    console.error("💡 Check your DATABASE_URL and DIRECT_URL in .env");
    process.exit(1);
  }
})();

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

// Handle unexpected disconnections
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
