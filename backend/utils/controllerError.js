const { isServiceError } = require("./serviceError");

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

    return res.status(error.status).json(payload);
  }

  console.error(logPrefix, error);

  const payload = {
    error: fallbackMessage,
  };

  if (includeErrorDetails && error?.message) {
    payload.details = error.message;
  }

  return res.status(500).json(payload);
};

module.exports = {
  sendControllerError,
};
