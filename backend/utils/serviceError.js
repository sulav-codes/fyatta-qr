class ServiceError extends Error {
  constructor(message, options = {}) {
    super(message);

    const {
      status = 500,
      code = null,
      details = undefined,
      expose = true,
    } = options;

    this.name = "ServiceError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = expose;
  }
}

const isServiceError = (error) => {
  return error instanceof ServiceError;
};

module.exports = {
  ServiceError,
  isServiceError,
};
