const jwt = require("jsonwebtoken");
const { users } = require("../models/index");

/**
 * Middleware to authenticate JWT token
 * Verifies token and attaches user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error:
          "No token provided. Authorization header must start with 'Bearer '",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const jwtSecret = process.env.JWT_SECRET_KEY || "your-secret-key";
    const decoded = jwt.verify(token, jwtSecret);

    // Get user from database
    const user = await users.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: "User not found",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: "Account is inactive",
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
      });
    }

    console.error("Authentication error:", error);
    return res.status(500).json({
      error: "Authentication failed",
      details: error.message,
    });
  }
};

/**
 * Middleware to check if user is staff/admin
 */
const requireStaff = (req, res, next) => {
  if (!req.user.isStaff && !req.user.isSuperuser) {
    return res.status(403).json({
      error: "Access denied. Staff privileges required.",
    });
  }
  next();
};

/**
 * Optional authentication - doesn't fail if no token
 * Used for public endpoints that can benefit from user context
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET_KEY || "your-secret-key";
    const decoded = jwt.verify(token, jwtSecret);

    const user = await users.findByPk(decoded.userId);
    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Token invalid, but don't fail - just continue without user
    next();
  }
};

module.exports = {
  authenticate,
  requireStaff,
  optionalAuth,
};
