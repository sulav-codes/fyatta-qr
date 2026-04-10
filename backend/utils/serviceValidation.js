const Joi = require("joi");
const { ServiceError } = require("./serviceError");

const DEFAULT_VALIDATION_OPTIONS = {
  abortEarly: false,
  convert: true,
  allowUnknown: false,
  stripUnknown: true,
};

const formatValidationDetails = (details = [], part = "body") => {
  return details.map((detail) => ({
    part,
    path: detail.path.join("."),
    message: detail.message.replace(/"/g, ""),
    type: detail.type,
  }));
};

const validatePayload = (
  schema,
  payload,
  { part = "body", prefs = {} } = {},
) => {
  if (!schema) {
    return payload;
  }

  const { error, value } = schema.validate(payload, {
    ...DEFAULT_VALIDATION_OPTIONS,
    ...prefs,
  });

  if (!error) {
    return value;
  }

  throw new ServiceError("Validation failed", {
    status: 400,
    code: "VALIDATION_ERROR",
    details: formatValidationDetails(error.details, part),
  });
};

module.exports = {
  Joi,
  validatePayload,
  DEFAULT_VALIDATION_OPTIONS,
};
