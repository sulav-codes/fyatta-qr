require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const multer = require("multer");
const http = require("http");
const { Server } = require("socket.io");
const routes = require("./routes/index");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "https://fyatta-qr.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible to route handlers
app.set("io", io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://fyatta-qr.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

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

// WebSocket connection handling
io.on("connection", (socket) => {
  // Join vendor room
  socket.on("join-vendor", (vendorId) => {
    socket.join(`vendor-${vendorId}`);
  });

  // Join table room
  socket.on("join-table", ({ vendorId, tableIdentifier }) => {
    const room = `table-${vendorId}-${tableIdentifier}`;
    socket.join(room);
  });

  // Leave vendor room
  socket.on("leave-vendor", (vendorId) => {
    socket.leave(`vendor-${vendorId}`);
  });

  // Leave table room
  socket.on("leave-table", ({ vendorId, tableIdentifier }) => {
    const room = `table-${vendorId}-${tableIdentifier}`;
    socket.leave(room);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready`);
});
