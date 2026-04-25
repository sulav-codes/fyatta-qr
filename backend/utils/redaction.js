const REDACTED_VALUE = "[REDACTED]";

const DEFAULT_REDACT_KEYS = [
  "authorization",
  "password",
  "token",
  "secret",
  "apikey",
  "api_key",
  "client_secret",
  "signature",
  "cookie",
  "set-cookie",
  "refresh",
  "jwt",
  "hash",
];

let _redactionKeys = null;

const getRedactionKeys = () => {
  if (!_redactionKeys) {
    const envKeys = String(process.env.LOG_REDACT_KEYS || "")
      .split(",")
      .map((key) => key.trim().toLowerCase())
      .filter(Boolean);

    _redactionKeys = new Set([...DEFAULT_REDACT_KEYS, ...envKeys]);
  }
  return _redactionKeys;
};

const resetRedactionKeys = () => {
  _redactionKeys = null;
};

const isPlainObject = (value) => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const shouldRedactKey = (key) => {
  const lowerCaseKey = String(key || "").toLowerCase();
  for (const pattern of getRedactionKeys()) {
    if (lowerCaseKey.includes(pattern)) {
      return true;
    }
  }
  return false;
};

const sanitizeError = (error) => {
  if (!(error instanceof Error)) {
    return error;
  }

  const sanitized = {
    name: error.name,
    message: error.message, 
  };

  if (error.stack) sanitized.stack = error.stack;
  if (error.code !== undefined) sanitized.code = error.code;
  if (error.status !== undefined) sanitized.status = error.status;

  return sanitized;
};

const sanitizeValue = (key, value, depth = 0) => {
  if (depth > 8) {
    return "[Truncated]";
  }

  if (shouldRedactKey(key)) {
    return REDACTED_VALUE;
  }

  if (value instanceof Error) {
    return sanitizeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (isPlainObject(item)) {
        const entries = Object.entries(item).map(([childKey, childValue]) => [
          childKey,
          sanitizeValue(childKey, childValue, depth + 1),
        ]);
        return Object.fromEntries(entries);
      }
      return sanitizeValue(key, item, depth + 1);
    });
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      sanitizeValue(childKey, childValue, depth + 1),
    ]);
    return Object.fromEntries(entries);
  }

  return value;
};

const redactForLogs = (payload) => {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if (payload instanceof Error) {
    return sanitizeError(payload);
  }

  if (!isPlainObject(payload)) {
    return payload;
  }

  const entries = Object.entries(payload).map(([key, value]) => [
    key,
    sanitizeValue(key, value),
  ]);

  return Object.fromEntries(entries);
};

module.exports = {
  redactForLogs,
  resetRedactionKeys, 
  REDACTED_VALUE,
};
