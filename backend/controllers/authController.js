const { users } = require("../models/index");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET_KEY;

// Register a new user with secure password hashing using bcrypt
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await users.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    if (user) {
      res.redirect("http://localhost:5173/login");
    } else {
      res.status(400).json({ error: "User registration failed" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Login a user and set the JWT token as a cookie
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user from the database by email
    const user = await users.findOne({ where: { email } });

    if (user && bcrypt.compareSync(password, user.password)) {
      // User data to return in the response
      const userData = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      };

      // Generate a JWT token (Set a secret key and expiration as per your needs)
      const token = jwt.sign(
        { userId: user.id, email: user.email }, // Payload with user data
        jwtSecret, // Secret
        { expiresIn: "1h" } // Token expiration time (1 hour in this example)
      );

      // Return success response with user data and token
      res.status(200).json({
        status: "success",
        message: "Login successful",
        data: {
          user: userData,
          token: token,
        },
      });
    } else {
      res.status(401).json({
        status: "error",
        message: "Invalid login",
        errorDetails: "Incorrect email or password",
      });
    }
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: "An error occurred during login",
      errorDetails: error.message,
    });
  }
};
