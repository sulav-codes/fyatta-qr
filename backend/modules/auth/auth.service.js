const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/prisma");
const {
  hashPassword,
  comparePassword,
  sanitizeUser,
} = require("../../utils/helpers");
const {
  issueAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate,
} = require("../../utils/tokenUtils");
const { ServiceError } = require("../../utils/serviceError");
const { validatePayload } = require("../../utils/serviceValidation");
const authValidation = require("./auth.validation");

const jwtSecret = process.env.JWT_SECRET_KEY || "your-secret-key";
const GOOGLE_STATE_EXPIRES_IN = process.env.GOOGLE_STATE_EXPIRES_IN || "5m";
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

const issueSessionTokens = async (user) => {
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

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
  };
};

const revokeAllActiveRefreshTokensForUser = async (userId) => {
  if (!userId) {
    return;
  }

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
  if (!user) {
    return true;
  }

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
    return prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        googleEmail: email,
        googlePicture: picture,
        authProvider: "google",
      },
    });
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        googleId,
        googleEmail: email,
        googlePicture: picture,
        authProvider: "google",
      },
    });
  }

  const username = await buildUniqueUsername(email);

  return prisma.user.create({
    data: {
      username,
      email,
      password: await hashPassword(crypto.randomBytes(32).toString("hex")),
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
    throw new Error(
      `Google token exchange failed: ${await tokenResponse.text()}`,
    );
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
    throw new Error(
      `Google token verification failed: ${await tokenInfoResponse.text()}`,
    );
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

const register = async ({ body }) => {
  const validatedBody = validatePayload(
    authValidation.registerBodySchema,
    body || {},
    { part: "body" },
  );

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
  } = validatedBody;

  const requiredFields = [
    "username",
    "email",
    "password",
    "restaurantName",
    "location",
  ];

  for (const field of requiredFields) {
    if (!body?.[field] || body[field].trim() === "") {
      throw new ServiceError(`${field} is required`, { status: 400 });
    }
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email: email.trim() },
  });

  if (existingEmail) {
    throw new ServiceError("An account with this email already exists", {
      status: 400,
    });
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username: username.trim() },
  });

  if (existingUsername) {
    throw new ServiceError("This username is already taken", {
      status: 400,
    });
  }

  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      email: email.trim(),
      password: await hashPassword(password),
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

  return {
    message: "Vendor registered successfully",
    user: sanitizeUser(user),
  };
};

const login = async ({ body }) => {
  const { email, password } = validatePayload(
    authValidation.loginBodySchema,
    body || {},
    { part: "body" },
  );

  if (!email || !password) {
    throw new ServiceError("Email and password are required", { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim() },
  });

  if (!user) {
    throw new ServiceError("Invalid email or password", { status: 401 });
  }

  if (!user.isActive) {
    throw new ServiceError(
      "Your account has been deactivated. Please contact support.",
      { status: 401 },
    );
  }

  if (!(await comparePassword(password, user.password))) {
    throw new ServiceError("Invalid email or password", { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const session = await issueSessionTokens(user);

  return {
    message: "Login successful",
    token: session.accessToken,
    refreshToken: session.refreshToken,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt,
    user: sanitizeUser(user),
  };
};

const googleStart = async () => {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new ServiceError("Google OAuth is not configured", {
      status: 400,
      code: "google_not_configured",
    });
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

  return authUrl.toString();
};

const googleCallback = async ({ query }) => {
  const validatedQuery = validatePayload(
    authValidation.googleCallbackQuerySchema,
    query || {},
    { part: "query", prefs: { allowUnknown: true, stripUnknown: false } },
  );

  const { clientId, clientSecret, redirectUri } = getGoogleConfig();
  const { code, state, error } = validatedQuery;

  if (error) {
    throw new ServiceError("Google auth provider returned an error", {
      status: 400,
      code: `google_${error}`,
    });
  }

  if (!code || !state) {
    throw new ServiceError("Missing OAuth code or state", {
      status: 400,
      code: "google_missing_code_or_state",
    });
  }

  if (!clientId || !clientSecret || !redirectUri) {
    throw new ServiceError("Google OAuth is not configured", {
      status: 400,
      code: "google_not_configured",
    });
  }

  try {
    jwt.verify(state, jwtSecret);
  } catch (stateError) {
    if (stateError?.name === "TokenExpiredError") {
      throw new ServiceError("OAuth state expired", {
        status: 401,
        code: "google_state_expired",
      });
    }

    throw new ServiceError("Invalid OAuth state", {
      status: 401,
      code: "google_invalid_state",
    });
  }

  const claims = await getVerifiedGoogleClaims({
    code,
    clientId,
    clientSecret,
    redirectUri,
  });

  let user = await upsertGoogleUser(claims);

  if (!user.isActive) {
    throw new ServiceError("Account is inactive", {
      status: 403,
      code: "account_inactive",
    });
  }

  user = await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
    },
  });

  const session = await issueSessionTokens(user);
  const safeUser = sanitizeUser(user);

  return {
    token: session.accessToken,
    refreshToken: session.refreshToken,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt,
    user: safeUser,
    needsProfileCompletion: isProfileIncomplete(safeUser),
  };
};

const refreshSession = async ({ incomingRefreshToken }) => {
  if (incomingRefreshToken !== null && incomingRefreshToken !== undefined) {
    ({ incomingRefreshToken } = validatePayload(
      authValidation.refreshTokenSchema,
      { incomingRefreshToken },
      { part: "headers" },
    ));
  }

  if (!incomingRefreshToken) {
    throw new ServiceError("Refresh token is missing", {
      status: 401,
      code: "TOKEN_MISSING",
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
    throw new ServiceError("Invalid refresh token", {
      status: 401,
      code: "TOKEN_INVALID",
    });
  }

  if (storedToken.revokedAt) {
    if (storedToken.replacedByTokenHash) {
      await revokeAllActiveRefreshTokensForUser(storedToken.userId);
      throw new ServiceError(
        "Refresh token reuse detected. Please sign in again.",
        {
          status: 401,
          code: "TOKEN_REUSE_DETECTED",
        },
      );
    }

    throw new ServiceError("Refresh token has been revoked", {
      status: 401,
      code: "TOKEN_REVOKED",
    });
  }

  if (storedToken.expiresAt <= new Date()) {
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    throw new ServiceError("Refresh token has expired", {
      status: 401,
      code: "TOKEN_EXPIRED",
    });
  }

  if (!storedToken.user || !storedToken.user.isActive) {
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    throw new ServiceError("User account is inactive", {
      status: 401,
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

  return {
    message: "Token refreshed successfully",
    token: signAuthToken(storedToken.user),
    user: sanitizeUser(storedToken.user),
    refreshToken: replacementRefreshToken,
    refreshTokenExpiresAt: replacementExpiry,
  };
};

const logout = async ({ incomingRefreshToken }) => {
  if (incomingRefreshToken) {
    ({ incomingRefreshToken } = validatePayload(
      authValidation.optionalRefreshTokenSchema,
      { incomingRefreshToken },
      { part: "headers" },
    ));

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

  return {
    message: "Logout successful",
  };
};

const getProfile = async ({ userId }) => {
  ({ userId } = validatePayload(
    authValidation.profileInputSchema,
    { userId },
    { part: "params" },
  ));

  const user = await prisma.user.findUnique({
    where: { id: userId },
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
    throw new ServiceError("User not found", { status: 404 });
  }

  return { user };
};

module.exports = {
  getGoogleConfig,
  register,
  login,
  googleStart,
  googleCallback,
  refreshSession,
  logout,
  getProfile,
};
