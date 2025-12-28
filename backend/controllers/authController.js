const { users } = require("../models/index");
const jwt = require("jsonwebtoken");
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
    const existingUser = await users.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        error: "An account with this email already exists",
      });
    }

    // Check if username already exists
    const existingUsername = await users.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({
        error: "This username is already taken",
      });
    }

    // Create the new vendor (password hashing handled by model hooks)
    const user = await users.create({
      username: username.trim(),
      email: email.trim(),
      password,
      restaurantName: restaurantName.trim(),
      ownerName: ownerName ? ownerName.trim() : null,
      phone: phone ? phone.trim() : null,
      location: location.trim(),
      description: description ? description.trim() : null,
      openingTime: openingTime || null,
      closingTime: closingTime || null,
      role: "vendor", // New registrations are always vendors
      vendorId: null, // Vendors don't have a parent vendor
      isActive: true,
    });

    res.status(201).json({
      message: "Vendor registered successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        restaurantName: user.restaurantName,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({
      error: error.message || "User registration failed",
    });
  }
};

/**
 * Login a vendor
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

    // Find the user by email
    const user = await users.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        error: "User does not exist",
      });
    }

    // Validate password using the model method
    const isValidPassword = await user.validatePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // User data to return in the response
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.ownerName,
      restaurantName: user.restaurantName,
      location: user.location,
    };

    // Generate a JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, {
      expiresIn: "24h",
    });

    // Return success response with user data and token
    res.status(200).json({
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "An error occurred during login",
      details: error.message,
    });
  }
};

/**
 * Logout a vendor (client-side token removal)
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
