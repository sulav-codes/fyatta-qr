import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import logger from "../config/logger.js";

// Middleware to authenticate JWT token and attach user to request
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn(
        "Authentication failed: missing or malformed authorization header",
        {
          method: req.method,
          path: req.originalUrl,
        },
      );

      return res.status(401).json({
        error:
          "No token provided. Authorization header must start with 'Bearer '",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const jwtSecret = process.env.JWT_SECRET_KEY;
    const decoded = jwt.verify(token, jwtSecret);

    const userId = Number.parseInt(String(decoded?.userId), 10);
    if (Number.isNaN(userId) || userId < 1) {
      logger.warn("Authentication failed: invalid token payload", {
        method: req.method,
        path: req.originalUrl,
      });

      return res.status(401).json({
        error: "Invalid token payload",
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        vendorId: true,
        isActive: true,
        isStaff: true,
        isSuperuser: true,
        restaurantName: true,
      },
    });

    if (!user) {
      logger.warn("Authentication failed: user not found", {
        method: req.method,
        path: req.originalUrl,
        userId,
      });

      return res.status(401).json({
        error: "User not found",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn("Authentication failed: user account inactive", {
        method: req.method,
        path: req.originalUrl,
        userId: user.id,
      });

      return res.status(401).json({
        error: "Account is inactive",
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      logger.warn("Authentication failed: invalid token", {
        method: req.method,
        path: req.originalUrl,
      });

      return res.status(401).json({
        error: "Invalid token",
      });
    }
    if (error.name === "TokenExpiredError") {
      logger.warn("Authentication failed: token expired", {
        method: req.method,
        path: req.originalUrl,
      });

      return res.status(401).json({
        error: "Token expired",
      });
    }

    logger.error("Authentication middleware error", {
      method: req.method,
      path: req.originalUrl,
      error,
    });

    const includeErrorDetails =
      process.env.NODE_ENV !== "production" ||
      String(process.env.AUTH_INCLUDE_ERROR_DETAILS).toLowerCase() === "true";

    const payload = {
      error: "Authentication failed",
    };

    if (includeErrorDetails && error?.message) {
      payload.details = error.message;
    }

    return res.status(500).json(payload);
  }
};

//Middleware to check if user is staff/admin
const requireStaff = (req, res, next) => {
  if (!req.user.isStaff && !req.user.isSuperuser) {
    return res.status(403).json({
      error: "Access denied. Staff privileges required.",
    });
  }
  next();
};

//Middleware to check if user is a vendor (restaurant owner)
const requireVendor = (req, res, next) => {
  if (req.user.role !== "vendor" && req.user.role !== "admin") {
    return res.status(403).json({
      error: "Access denied. Vendor privileges required.",
    });
  }
  next();
};

//Middleware to check if user is an admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Access denied. Admin privileges required.",
    });
  }
  next();
};

// Middleware to ensure tenant access control based on user role and vendorId
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

// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // If no auth header at all, just continue
    if (!authHeader) {
      return next();
    }

    // If auth header exists but doesn't start with Bearer, ignore it and continue
    if (!authHeader.startsWith("Bearer ")) {
      logger.debug(
        "Optional authentication skipped: authorization header is not Bearer format",
        {
          method: req.method,
          path: req.originalUrl,
        },
      );

      return next();
    }

    const token = authHeader.substring(7);

    // If token is empty after removing Bearer, continue without user
    if (!token || token.trim() === "") {
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET_KEY;
    const decoded = jwt.verify(token, jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        vendorId: true,
        isActive: true,
        isStaff: true,
        isSuperuser: true,
      },
    });

    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Token invalid, but don't fail - just continue without user
    logger.debug(
      "Optional authentication token validation failed, continuing without user",
      {
        method: req.method,
        path: req.originalUrl,
        reason: error?.name || "UnknownError",
      },
    );

    next();
  }
};

export default {
  authenticate,
  requireStaff,
  requireVendor,
  requireAdmin,
  ensureTenantAccess,
  optionalAuth,
};
