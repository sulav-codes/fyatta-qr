const prisma = require("../config/prisma");
const jwt = require("jsonwebtoken");
const {
  hashPassword,
  comparePassword,
  sanitizeUser,
} = require("../utils/helpers");

const jwtSecret = process.env.JWT_SECRET_KEY || "your-secret-key";

/**
 * Register a new vendor
 * Validates required fields and creates a new vendor account
 */
exports.register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      restaurantName,
      ownerName,
      phone,
      location,
      description,
      openingTime,
      closingTime,
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "username",
      "email",
      "password",
      "restaurantName",
      "location",
    ];
    for (const field of requiredFields) {
      if (!req.body[field] || req.body[field].trim() === "") {
        return res.status(400).json({
          error: `${field} is required`,
        });
      }
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (existingEmail) {
      return res.status(400).json({
        error: "An account with this email already exists",
      });
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (existingUsername) {
      return res.status(400).json({
        error: "This username is already taken",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create the new vendor
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim(),
        password: hashedPassword,
        restaurantName: restaurantName.trim(),
        ownerName: ownerName ? ownerName.trim() : null,
        phone: phone ? phone.trim() : null,
        location: location.trim(),
        description: description ? description.trim() : null,
        openingTime: openingTime || null,
        closingTime: closingTime || null,
        role: "vendor",
        isActive: true,
      },
    });

    res.status(201).json({
      message: "Vendor registered successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Registration failed. Please try again.",
      details: error.message,
    });
  }
};

/**
 * Login user
 * Validates credentials and returns JWT token
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        error: "Your account has been deactivated. Please contact support.",
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed. Please try again.",
      details: error.message,
    });
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        restaurantName: true,
        ownerName: true,
        phone: true,
        location: true,
        description: true,
        openingTime: true,
        closingTime: true,
        logo: true,
        role: true,
        vendorId: true,
        isActive: true,
        dateJoined: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      error: "Failed to get profile",
      details: error.message,
    });
  }
};

/**
 * Logout user (client-side token removal)
 */
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    res.status(500).json({
      error: "An error occurred during logout",
    });
  }
};

module.exports = exports;
