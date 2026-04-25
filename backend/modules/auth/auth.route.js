import { Router } from "express";
const router = Router();
import validateMiddleware from "../../middlewares/validate.middleware.js";
import rateLimiter from "../../middlewares/rateLimiter.js";
import {
  registerBodySchema,
  loginBodySchema,
  googleCallbackQuerySchema,
} from "./auth.validation.js";
import {
  register,
  login,
  logout,
  refreshToken,
  googleStart,
  googleCallback,
} from "./auth.controller.js";

const { authLimiter, publicWriteLimiter } = rateLimiter;
const { validate } = validateMiddleware;

// Public routes
router.post(
  "/register",
  publicWriteLimiter,
  validate(registerBodySchema),
  register,
);
router.post(
  "/login",
  authLimiter,
  validate(loginBodySchema),
  login,
);
router.post("/refresh", authLimiter, refreshToken);
router.post("/logout", authLimiter, logout);
router.get("/google/start", authLimiter, googleStart);
router.get(
  "/google/callback",
  authLimiter,
  validate({ query: googleCallbackQuerySchema }),
  googleCallback,
);

export default router;
