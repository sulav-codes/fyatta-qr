const { Joi } = require("../../utils/serviceValidation");

const positiveId = Joi.number().integer().positive();

const registerBodySchema = Joi.object({
  username: Joi.string().trim().min(3).max(40).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
  restaurantName: Joi.string().trim().min(2).max(120).required(),
  ownerName: Joi.string().trim().max(100).allow("", null).optional(),
  phone: Joi.string().trim().max(30).allow("", null).optional(),
  location: Joi.string().trim().min(2).max(180).required(),
  description: Joi.string().trim().max(1000).allow("", null).optional(),
  openingTime: Joi.string().trim().max(16).allow("", null).optional(),
  closingTime: Joi.string().trim().max(16).allow("", null).optional(),
}).unknown(false);

const loginBodySchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(1).max(128).required(),
}).unknown(false);

const googleCallbackQuerySchema = Joi.object({
  code: Joi.string().trim().max(2048).optional(),
  state: Joi.string().trim().max(2048).optional(),
  error: Joi.string().trim().max(256).optional(),
}).unknown(true);

const refreshTokenSchema = Joi.object({
  incomingRefreshToken: Joi.string().trim().min(32).max(512).required(),
});

const optionalRefreshTokenSchema = Joi.object({
  incomingRefreshToken: Joi.string().trim().min(32).max(512).optional(),
});

const profileInputSchema = Joi.object({
  userId: positiveId.required(),
});

module.exports = {
  registerBodySchema,
  loginBodySchema,
  googleCallbackQuerySchema,
  refreshTokenSchema,
  optionalRefreshTokenSchema,
  profileInputSchema,
};
