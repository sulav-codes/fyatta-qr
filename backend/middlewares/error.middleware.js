import { MulterError } from "multer";
import { isServiceError } from "../utils/serviceError.js";
import logger from "../config/logger.js";

const shouldIncludeUnexpectedErrorDetails = () => {
  return process.env.NODE_ENV !== "production";
};

const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof MulterError) {
    const payload =
      err.code === "LIMIT_FILE_SIZE"
        ? { error: "File size too large. Max size is 5MB" }
        : { error: err.message };

    logger.warn("File upload validation failed", {
      code: err.code,
      method: req.method,
      path: req.originalUrl,
      statusCode: 400,
    });

    return res.status(400).json(payload);
  }

  if (isServiceError(err)) {
    const shouldExpose = err.expose !== false;
    const payload = {
      error: shouldExpose ? err.message : "Request failed",
    };

    if (err.code) {
      payload.code = err.code;
    }

    if (shouldExpose && err.details !== undefined) {
      payload.details = err.details;
    }

    const statusCode = Number.isInteger(err.status) ? err.status : 500;
    const logMetadata = {
      statusCode,
      method: req.method,
      path: req.originalUrl,
      code: err.code,
    };

    if (statusCode >= 500) {
      logger.error("Service error reached global middleware", {
        ...logMetadata,
        error: err,
      });
    } else {
      logger.warn("Service error reached global middleware", logMetadata);
    }

    return res.status(statusCode).json(payload);
  }

  const statusCode =
    Number.isInteger(err?.status) && err.status >= 400 ? err.status : 500;
  const payload = {
    error: "Internal server error",
  };

  if (shouldIncludeUnexpectedErrorDetails() && err?.message) {
    payload.details = err.message;
  }

  logger.error("Unhandled request error", {
    statusCode,
    method: req.method,
    path: req.originalUrl,
    error: err,
  });

  return res.status(statusCode).json(payload);
};

export { errorMiddleware };
