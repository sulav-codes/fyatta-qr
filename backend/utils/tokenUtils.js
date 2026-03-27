const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_DAYS = Number(
  process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30,
);
const REFRESH_TOKEN_COOKIE_NAME =
  process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken";

const VALID_SAME_SITE = new Set(["lax", "strict", "none"]);

const getCookieSameSite = () => {
  const value = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  return VALID_SAME_SITE.has(value) ? value : "lax";
};

const issueAccessToken = (user, jwtSecret = process.env.JWT_SECRET_KEY) => {
  if (!jwtSecret) {
    throw new Error("JWT_SECRET_KEY is required to issue access tokens");
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const getRefreshTokenExpiryDate = (
  days = REFRESH_TOKEN_EXPIRES_DAYS,
  now = new Date(),
) => {
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + days);
  return expiry;
};

const getRefreshCookieOptions = (expiresAt) => {
  const secure = process.env.NODE_ENV === "production";
  const sameSite = getCookieSameSite();

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/auth",
    expires: expiresAt,
  };
};

module.exports = {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_DAYS,
  REFRESH_TOKEN_COOKIE_NAME,
  issueAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate,
  getRefreshCookieOptions,
};
