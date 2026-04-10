const { Joi } = require("../../utils/serviceValidation");

const positiveId = Joi.number().integer().positive();

const vendorParamsSchema = Joi.object({
  vendorId: positiveId.required(),
});

const updateProfileBodySchema = Joi.object({
  restaurantName: Joi.string().trim().max(120).optional(),
  restaurant_name: Joi.string().trim().max(120).optional(),
  ownerName: Joi.string().trim().max(100).allow("", null).optional(),
  owner_name: Joi.string().trim().max(100).allow("", null).optional(),
  email: Joi.string().trim().email().optional(),
  phone: Joi.string().trim().max(30).allow("", null).optional(),
  location: Joi.string().trim().max(180).optional(),
  description: Joi.string().trim().max(1000).allow("", null).optional(),
  openingTime: Joi.string().trim().max(16).allow("", null).optional(),
  opening_time: Joi.string().trim().max(16).allow("", null).optional(),
  closingTime: Joi.string().trim().max(16).allow("", null).optional(),
  closing_time: Joi.string().trim().max(16).allow("", null).optional(),
}).unknown(false);

const salesReportQuerySchema = Joi.object({
  timeframe: Joi.string()
    .trim()
    .valid("day", "week", "month", "year")
    .optional(),
}).unknown(true);

const paginationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
}).unknown(true);

module.exports = {
  vendorParamsSchema,
  updateProfileBodySchema,
  salesReportQuerySchema,
  paginationQuerySchema,
};
