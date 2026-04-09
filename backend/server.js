require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const multer = require("multer");
const http = require("http");
const routes = require("./routes/index");
const { createSocketServer } = require("./sockets");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

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

// Routes
app.use("/", routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File size too large. Max size is 5MB" });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on Port:${PORT}`);
  console.log(`WebSocket server ready`);
});
