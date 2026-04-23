const authService = require("./auth.service");
const { sendControllerError } = require("../../utils/controllerError");
const logger = require("../../config/logger");
const {
  REFRESH_TOKEN_COOKIE_NAME,
  getRefreshCookieOptions,
} = require("../../utils/tokenUtils");

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

const redirectWithError = (res, baseUrl, code) => {
  const failureUrl = new URL(baseUrl);
  failureUrl.searchParams.set("error", code);
  return res.redirect(failureUrl.toString());
};

const encodeUserForRedirect = (user) => {
  return Buffer.from(JSON.stringify(user)).toString("base64url");
};

exports.register = async (req, res) => {
  try {
    const response = await authService.register({
      body: req.body,
    });

    res.status(201).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Registration error:",
      fallbackMessage: "Registration failed. Please try again.",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const response = await authService.login({
      body: req.body,
    });

    setRefreshTokenCookie(
      res,
      response.refreshToken,
      response.refreshTokenExpiresAt,
    );

    res.json({
      message: response.message,
      token: response.token,
      user: response.user,
    });
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Login error:",
      fallbackMessage: "Login failed. Please try again.",
    });
  }
};

exports.googleStart = async (req, res) => {
  const { frontendFailureUrl } = authService.getGoogleConfig();

  try {
    const authUrl = await authService.googleStart();
    return res.redirect(authUrl);
  } catch (error) {
    logger.error("Google OAuth start error", {
      module: "auth-controller",
      error,
    });

    return redirectWithError(
      res,
      frontendFailureUrl,
      error.code || "google_start_failed",
    );
  }
};

exports.googleCallback = async (req, res) => {
  const { frontendFailureUrl, frontendSuccessUrl } =
    authService.getGoogleConfig();

  try {
    const response = await authService.googleCallback({
      query: req.query,
    });

    setRefreshTokenCookie(
      res,
      response.refreshToken,
      response.refreshTokenExpiresAt,
    );

    const successUrl = new URL(frontendSuccessUrl);
    successUrl.searchParams.set("token", response.token);
    successUrl.searchParams.set("user", encodeUserForRedirect(response.user));
    successUrl.searchParams.set(
      "needsProfileCompletion",
      response.needsProfileCompletion ? "1" : "0",
    );

    return res.redirect(successUrl.toString());
  } catch (error) {
    logger.error("Google OAuth callback error", {
      module: "auth-controller",
      error,
    });

    return redirectWithError(
      res,
      frontendFailureUrl,
      error.code || "google_auth_failed",
    );
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const response = await authService.refreshSession({
      incomingRefreshToken: getRefreshTokenFromRequest(req),
    });

    setRefreshTokenCookie(
      res,
      response.refreshToken,
      response.refreshTokenExpiresAt,
    );

    return res.status(200).json({
      message: response.message,
      token: response.token,
      user: response.user,
    });
  } catch (error) {
    if (error?.status === 401) {
      clearRefreshTokenCookie(res);
    }

    return sendControllerError(res, error, {
      logPrefix: "Refresh token error:",
      fallbackMessage: "Failed to refresh token",
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const response = await authService.getProfile({
      userId: req.user.id,
    });

    res.json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Get profile error:",
      fallbackMessage: "Failed to get profile",
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const response = await authService.logout({
      incomingRefreshToken: getRefreshTokenFromRequest(req),
    });

    clearRefreshTokenCookie(res);

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Logout error:",
      fallbackMessage: "An error occurred during logout",
      includeErrorDetails: false,
    });
  }
};

module.exports = exports;
