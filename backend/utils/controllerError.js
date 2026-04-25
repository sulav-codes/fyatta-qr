import { isServiceError } from "./serviceError.js";
import logger from "../config/logger.js";

const sendControllerError = (
  res,
  error,
  {
    logPrefix = "Controller error:",
    fallbackMessage = "Request failed",
    includeErrorDetails = process.env.NODE_ENV !== "production",
  } = {},
) => {
  if (isServiceError(error)) {
    const statusCode = Number.isInteger(error.status) ? error.status : 500;
    const shouldExpose = error.expose !== false;
    const payload = {
      error: shouldExpose ? error.message : fallbackMessage,
    };

    if (error.code) {
      payload.code = error.code;
    }

    if (shouldExpose && error.details !== undefined) {
      payload.details = error.details;
    }

    const logMetadata = {
      logPrefix,
      statusCode,
      code: error.code,
    };

    if (statusCode >= 500) {
      logger.error(logPrefix, {
        ...logMetadata,
        error,
      });
    } else {
      logger.warn(logPrefix, logMetadata);
    }

    return res.status(statusCode).json(payload);
  }

  logger.error(logPrefix, {
    error,
    statusCode: 500,
  });

  const payload = {
    error: fallbackMessage,
  };

  if (includeErrorDetails && error?.message) {
    payload.details = error.message;
  }

  return res.status(500).json(payload);
};

export { sendControllerError };
