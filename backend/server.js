require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes/index"); // Ensure this is loaded once before any route

const app = express();
const PORT = process.env.PORT || 8000; // Use environment variable or fallback

// Middleware
app.use(express.json()); // Parse JSON payloads
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded payloads
app.use(express.static("public")); // Serve static files

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000", // Configurable client URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow cookies if needed
  })
);

// Routes
app.use("/", routes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
