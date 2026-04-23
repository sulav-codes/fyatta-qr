require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const routes = require("./routes/index");
const { createSocketServer } = require("./sockets");
const { apiLimiter } = require("./middlewares/rateLimiter");
const logger = require("./config/logger");
const { errorMiddleware } = require("./middlewares/error.middleware");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

const resolveTrustProxy = () => {
  const rawValue = process.env.TRUST_PROXY;

  if (!rawValue) {
    return process.env.NODE_ENV === "production" ? 1 : false;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  const numeric = Number.parseInt(rawValue, 10);
  return Number.isNaN(numeric) ? rawValue : numeric;
};

app.set("trust proxy", resolveTrustProxy());

// Socket.IO setup
const io = createSocketServer(server);

// Make io accessible to route handlers
app.set("io", io);

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://fyatta-qr.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Lightweight health endpoint for container checks
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Baseline API throttling for public/protected API traffic
app.use("/api", apiLimiter);

// Routes
app.use("/", routes);

// Error handling middleware
app.use(errorMiddleware);

// Start the server
server.listen(PORT, () => {
  logger.info("Server listening", {
    port: PORT,
  });
  logger.info("WebSocket server ready");
});

server.on("error", (error) => {
  logger.error("Server failed to start", {
    error,
  });
});
