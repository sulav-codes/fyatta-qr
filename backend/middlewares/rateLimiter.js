const rateLimit = require("express-rate-limit");

const DEFAULT_RATE_LIMIT_MESSAGE = "Too many requests. Please try again later.";

const toPositiveInt = (rawValue, fallbackValue) => {
  const parsed = Number.parseInt(String(rawValue), 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallbackValue : parsed;
};

const getRetryAfterInSeconds = (resetTime) => {
  if (!resetTime) {
    return undefined;
  }

  const resetTimestamp = new Date(resetTime).getTime();
  const remainingMs = resetTimestamp - Date.now();

  if (Number.isNaN(resetTimestamp) || remainingMs <= 0) {
    return undefined;
  }

  return Math.ceil(remainingMs / 1000);
};

const createRateLimiter = ({
  windowMs,
  limit,
  message = DEFAULT_RATE_LIMIT_MESSAGE,
  code = "RATE_LIMIT_EXCEEDED",
  skipSuccessfulRequests = false,
  skipFailedRequests = false,
}) => {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    skipFailedRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = getRetryAfterInSeconds(req.rateLimit?.resetTime);

      return res.status(429).json({
        error: message,
        code,
        retryAfter,
      });
    },
  });
};

const apiLimiter = createRateLimiter({
  windowMs: toPositiveInt(process.env.RATE_LIMIT_API_WINDOW_MS, 15 * 60 * 1000),
  limit: toPositiveInt(process.env.RATE_LIMIT_API_MAX, 600),
  message: "Too many API requests. Please try again shortly.",
});

const authLimiter = createRateLimiter({
  windowMs: toPositiveInt(
    process.env.RATE_LIMIT_AUTH_WINDOW_MS,
    15 * 60 * 1000,
  ),
  limit: toPositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 20),
  message: "Too many authentication attempts. Please try again later.",
  code: "AUTH_RATE_LIMIT_EXCEEDED",
  skipSuccessfulRequests: true,
});

const publicWriteLimiter = createRateLimiter({
  windowMs: toPositiveInt(
    process.env.RATE_LIMIT_PUBLIC_WRITE_WINDOW_MS,
    10 * 60 * 1000,
  ),
  limit: toPositiveInt(process.env.RATE_LIMIT_PUBLIC_WRITE_MAX, 60),
  message: "Too many write requests. Please slow down and retry.",
});

const paymentLimiter = createRateLimiter({
  windowMs: toPositiveInt(
    process.env.RATE_LIMIT_PAYMENT_WINDOW_MS,
    10 * 60 * 1000,
  ),
  limit: toPositiveInt(process.env.RATE_LIMIT_PAYMENT_MAX, 40),
  message: "Too many payment requests. Please retry in a moment.",
  code: "PAYMENT_RATE_LIMIT_EXCEEDED",
});

const waiterCallLimiter = createRateLimiter({
  windowMs: toPositiveInt(
    process.env.RATE_LIMIT_WAITER_WINDOW_MS,
    5 * 60 * 1000,
  ),
  limit: toPositiveInt(process.env.RATE_LIMIT_WAITER_MAX, 30),
  message: "Too many waiter calls. Please wait a moment before retrying.",
});

module.exports = {
  apiLimiter,
  authLimiter,
  publicWriteLimiter,
  paymentLimiter,
  waiterCallLimiter,
  createRateLimiter,
};
