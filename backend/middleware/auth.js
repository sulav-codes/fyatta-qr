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
 * Middleware to check if user is a vendor (restaurant owner)
 */
const requireVendor = (req, res, next) => {
  if (req.user.role !== "vendor" && req.user.role !== "admin") {
    return res.status(403).json({
      error: "Access denied. Vendor privileges required.",
    });
  }
  next();
};

/**
 * Middleware to check if user is an admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Access denied. Admin privileges required.",
    });
  }
  next();
};

/**
 * Middleware to ensure staff can only access their vendor's data
 * Attaches effective vendorId to request
 */
const ensureTenantAccess = (req, res, next) => {
  // For vendors, they access their own data
  if (req.user.role === "vendor") {
    req.effectiveVendorId = req.user.id;
  }
  // For staff, they access their vendor's data
  else if (req.user.role === "staff") {
    req.effectiveVendorId = req.user.vendorId;
  }
  // Admins can access any data
  else if (req.user.role === "admin") {
    req.effectiveVendorId = req.params.vendorId || null;
  } else {
    return res.status(403).json({
      error: "Access denied. Invalid user role.",
    });
  }

  // Validate that staff/vendor can only access their own tenant data
  if (
    req.params.vendorId &&
    req.user.role !== "admin" &&
    parseInt(req.params.vendorId) !== req.effectiveVendorId
  ) {
    return res.status(403).json({
      error: "Access denied. You can only access your own restaurant's data.",
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

    // If no auth header at all, just continue
    if (!authHeader) {
      return next();
    }

    // If auth header exists but doesn't start with Bearer, ignore it and continue
    if (!authHeader.startsWith("Bearer ")) {
      console.log(
        "[optionalAuth] Auth header exists but not Bearer format, ignoring:",
        authHeader
      );
      return next();
    }

    const token = authHeader.substring(7);

    // If token is empty after removing Bearer, continue without user
    if (!token || token.trim() === "") {
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET_KEY || "your-secret-key";
    const decoded = jwt.verify(token, jwtSecret);

    const user = await users.findByPk(decoded.userId);
    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Token invalid, but don't fail - just continue without user
    console.log(
      "[optionalAuth] Token validation failed, continuing without user:",
      error.message
    );
    next();
  }
};

module.exports = {
  authenticate,
  requireStaff,
  requireVendor,
  requireAdmin,
  ensureTenantAccess,
  optionalAuth,
};
