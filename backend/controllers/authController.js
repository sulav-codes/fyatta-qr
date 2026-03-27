const prisma = require("../config/prisma");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  hashPassword,
  comparePassword,
  sanitizeUser,
} = require("../utils/helpers");
const {
  REFRESH_TOKEN_COOKIE_NAME,
  issueAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate,
  getRefreshCookieOptions,
} = require("../utils/tokenUtils");

const jwtSecret = process.env.JWT_SECRET_KEY || "your-secret-key";
const GOOGLE_STATE_EXPIRES_IN = "10m";
const PROFILE_PLACEHOLDER_LOCATION = "PENDING_PROFILE_COMPLETION";
const PROFILE_PLACEHOLDER_NAME = "New Restaurant";

const getGoogleConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const frontendBase = process.env.CLIENT_URL || "http://localhost:3000";

  return {
    clientId,
    clientSecret,
    redirectUri,
    frontendSuccessUrl:
      process.env.GOOGLE_FRONTEND_SUCCESS_URL ||
      `${frontendBase}/oauth/callback`,
    frontendFailureUrl:
      process.env.GOOGLE_FRONTEND_FAILURE_URL || `${frontendBase}/login`,
  };
};

const signAuthToken = (user) => {
  return issueAccessToken(user, jwtSecret);
};

const setRefreshTokenCookie = (res, refreshToken, expiresAt) => {
  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    refreshToken,
    getRefreshCookieOptions(expiresAt),
  );
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(
    REFRESH_TOKEN_COOKIE_NAME,
    getRefreshCookieOptions(new Date(0)),
  );
};

const getRefreshTokenFromRequest = (req) => {
  return req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || null;
};

const issueSessionTokens = async (res, user) => {
  const accessToken = signAuthToken(user);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const refreshTokenExpiresAt = getRefreshTokenExpiryDate();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
    },
  });

  setRefreshTokenCookie(res, refreshToken, refreshTokenExpiresAt);
  return accessToken;
};

const revokeAllActiveRefreshTokensForUser = async (userId) => {
  if (!userId) return;

  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

const redirectWithError = (res, baseUrl, code) => {
  const failureUrl = new URL(baseUrl);
  failureUrl.searchParams.set("error", code);
  return res.redirect(failureUrl.toString());
};

const encodeUserForRedirect = (user) => {
  return Buffer.from(JSON.stringify(sanitizeUser(user))).toString("base64url");
};

const buildUniqueUsername = async (email) => {
  const emailPrefix = (email || "").split("@")[0];
  const sanitizedBase = emailPrefix.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 18);
  const base = sanitizedBase || "vendor";

  let candidate = base;
  let counter = 1;

  while (counter < 1000) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${base}${counter}`;
    counter += 1;
  }

  return `vendor${Date.now()}`;
};

const isProfileIncomplete = (user) => {
  if (!user) return true;
  const restaurantName = (user.restaurantName || "").trim();
  const location = (user.location || "").trim();

  return (
    !restaurantName ||
    restaurantName === PROFILE_PLACEHOLDER_NAME ||
    !location ||
    location === PROFILE_PLACEHOLDER_LOCATION
  );
};

const upsertGoogleUser = async (claims) => {
  const googleId = claims.sub;
  const email = (claims.email || "").trim().toLowerCase();
  const picture = claims.picture || null;
  const displayName = (claims.name || "").trim();

  let user = await prisma.user.findUnique({
    where: { googleId },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        googleEmail: email,
        googlePicture: picture,
        authProvider: "google",
      },
    });
    return user;
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingByEmail) {
    user = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        googleId,
        googleEmail: email,
        googlePicture: picture,
        authProvider: "google",
      },
    });
    return user;
  }

  const username = await buildUniqueUsername(email);
  const randomPassword = crypto.randomBytes(32).toString("hex");
  const hashedPassword = await hashPassword(randomPassword);

  user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      authProvider: "google",
      googleId,
      googleEmail: email,
      googlePicture: picture,
      restaurantName: PROFILE_PLACEHOLDER_NAME,
      ownerName: displayName || null,
      phone: null,
      location: PROFILE_PLACEHOLDER_LOCATION,
      description: null,
      openingTime: null,
      closingTime: null,
      role: "vendor",
      isActive: true,
    },
  });

  return user;
};

const getVerifiedGoogleClaims = async ({
  code,
  clientId,
  clientSecret,
  redirectUri,
}) => {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    throw new Error(`Google token exchange failed: ${errorBody}`);
  }

  const tokenPayload = await tokenResponse.json();
  const idToken = tokenPayload.id_token;

  if (!idToken) {
    throw new Error("Missing id_token in Google response");
  }

  const tokenInfoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!tokenInfoResponse.ok) {
    const errorBody = await tokenInfoResponse.text();
    throw new Error(`Google token verification failed: ${errorBody}`);
  }

  const claims = await tokenInfoResponse.json();

  if (!claims || !claims.sub || !claims.email) {
    throw new Error("Google claims are incomplete");
  }

  const isValidAudience = claims.aud === clientId;
  const isValidIssuer =
    claims.iss === "accounts.google.com" ||
    claims.iss === "https://accounts.google.com";
  const isEmailVerified = claims.email_verified === "true";
  const isNotExpired = Number(claims.exp || "0") * 1000 > Date.now();

  if (!isValidAudience || !isValidIssuer || !isEmailVerified || !isNotExpired) {
    throw new Error("Google token claims validation failed");
  }

  return claims;
};

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
    const token = await issueSessionTokens(res, user);

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
 * Start Google OAuth flow
 */
exports.googleStart = async (req, res) => {
  try {
    const { clientId, clientSecret, redirectUri, frontendFailureUrl } =
      getGoogleConfig();

    if (!clientId || !clientSecret || !redirectUri) {
      return redirectWithError(
        res,
        frontendFailureUrl,
        "google_not_configured",
      );
    }

    const state = jwt.sign(
      {
        nonce: crypto.randomUUID(),
      },
      jwtSecret,
      { expiresIn: GOOGLE_STATE_EXPIRES_IN },
    );

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "select_account");

    return res.redirect(authUrl.toString());
  } catch (error) {
    console.error("Google OAuth start error:", error);
    const { frontendFailureUrl } = getGoogleConfig();
    return redirectWithError(res, frontendFailureUrl, "google_start_failed");
  }
};

/**
 * Google OAuth callback
 */
exports.googleCallback = async (req, res) => {
  const {
    frontendFailureUrl,
    frontendSuccessUrl,
    clientId,
    clientSecret,
    redirectUri,
  } = getGoogleConfig();

  try {
    const { code, state, error } = req.query;

    if (error) {
      return redirectWithError(res, frontendFailureUrl, `google_${error}`);
    }

    if (!code || !state) {
      return redirectWithError(
        res,
        frontendFailureUrl,
        "google_missing_code_or_state",
      );
    }

    if (!clientId || !clientSecret || !redirectUri) {
      return redirectWithError(
        res,
        frontendFailureUrl,
        "google_not_configured",
      );
    }

    jwt.verify(state, jwtSecret);

    const claims = await getVerifiedGoogleClaims({
      code,
      clientId,
      clientSecret,
      redirectUri,
    });

    let user = await upsertGoogleUser(claims);

    if (!user.isActive) {
      return redirectWithError(res, frontendFailureUrl, "account_inactive");
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
      },
    });

    const sessionToken = await issueSessionTokens(res, user);
    const safeUser = sanitizeUser(user);
    const successUrl = new URL(frontendSuccessUrl);
    successUrl.searchParams.set("token", sessionToken);
    successUrl.searchParams.set("user", encodeUserForRedirect(safeUser));
    successUrl.searchParams.set(
      "needsProfileCompletion",
      isProfileIncomplete(safeUser) ? "1" : "0",
    );

    return res.redirect(successUrl.toString());
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return redirectWithError(res, frontendFailureUrl, "google_auth_failed");
  }
};

/**
 * Rotate refresh token and return a fresh access token
 */
exports.refreshToken = async (req, res) => {
  try {
    const incomingRefreshToken = getRefreshTokenFromRequest(req);

    if (!incomingRefreshToken) {
      return res.status(401).json({
        error: "Refresh token is missing",
      });
    }

    const incomingHash = hashToken(incomingRefreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: incomingHash },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: "Invalid refresh token",
      });
    }

    if (storedToken.revokedAt) {
      if (storedToken.replacedByTokenHash) {
        await revokeAllActiveRefreshTokensForUser(storedToken.userId);
        clearRefreshTokenCookie(res);
        return res.status(401).json({
          error: "Refresh token reuse detected. Please sign in again.",
          code: "TOKEN_REUSE_DETECTED",
        });
      }

      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: "Refresh token has been revoked",
        code: "TOKEN_REVOKED",
      });
    }

    if (storedToken.expiresAt <= new Date()) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: "Refresh token has expired",
        code: "TOKEN_EXPIRED",
      });
    }

    if (!storedToken.user || !storedToken.user.isActive) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: "User account is inactive",
        code: "USER_INACTIVE",
      });
    }

    const replacementRefreshToken = generateRefreshToken();
    const replacementHash = hashToken(replacementRefreshToken);
    const replacementExpiry = getRefreshTokenExpiryDate();
    const now = new Date();

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revokedAt: now,
          replacedByTokenHash: replacementHash,
        },
      }),
      prisma.refreshToken.create({
        data: {
          userId: storedToken.userId,
          tokenHash: replacementHash,
          expiresAt: replacementExpiry,
        },
      }),
      prisma.user.update({
        where: { id: storedToken.userId },
        data: { lastLogin: now },
      }),
    ]);

    setRefreshTokenCookie(res, replacementRefreshToken, replacementExpiry);

    return res.status(200).json({
      message: "Token refreshed successfully",
      token: signAuthToken(storedToken.user),
      user: sanitizeUser(storedToken.user),
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({
      error: "Failed to refresh token",
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
 * Logout user and revoke refresh token
 */
exports.logout = async (req, res) => {
  try {
    const incomingRefreshToken = getRefreshTokenFromRequest(req);

    if (incomingRefreshToken) {
      const incomingHash = hashToken(incomingRefreshToken);
      await prisma.refreshToken.updateMany({
        where: {
          tokenHash: incomingHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    clearRefreshTokenCookie(res);

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
