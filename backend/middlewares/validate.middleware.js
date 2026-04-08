const Joi = require("joi");

const DEFAULT_PREFS = {
  body: {
    abortEarly: false,
    convert: true,
    allowUnknown: false,
    stripUnknown: true,
  },
  params: {
    abortEarly: false,
    convert: true,
    allowUnknown: false,
    stripUnknown: false,
  },
  query: {
    abortEarly: false,
    convert: true,
    allowUnknown: true,
    stripUnknown: false,
  },
  headers: {
    abortEarly: false,
    convert: true,
    allowUnknown: true,
    stripUnknown: false,
  },
};

const formatErrorDetails = (details = [], part) => {
  return details.map((detail) => ({
    part,
    path: detail.path.join("."),
    message: detail.message.replace(/\"/g, ""),
    type: detail.type,
  }));
};

const validate = (schemas, customPrefs = {}) => {
  return (req, res, next) => {
    const validationDetails = [];
    const requestParts = ["params", "query", "body", "headers"];

    for (const part of requestParts) {
      const schema = schemas?.[part];
      if (!schema) {
        continue;
      }

      const prefs = {
        ...DEFAULT_PREFS[part],
        ...(customPrefs?.[part] || {}),
      };

      const { error, value } = schema.validate(req[part], prefs);

      if (error) {
        validationDetails.push(...formatErrorDetails(error.details, part));
        continue;
      }

      if (part !== "headers") {
        req[part] = value;
      }
    }

    if (validationDetails.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: validationDetails,
      });
    }

    return next();
  };
};

module.exports = {
  Joi,
  validate,
};
