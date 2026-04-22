const { Joi } = require("../../utils/serviceValidation");

const positiveId = Joi.number().integer().positive();

const initiateEsewaPaymentBodySchema = Joi.object({
  orderId: positiveId.required(),
});

const verifyEsewaPaymentQuerySchema = Joi.object({
  data: Joi.string().trim().optional(),
}).unknown(true);

const paymentStatusParamsSchema = Joi.object({
  orderId: positiveId.required(),
});

module.exports = {
  initiateEsewaPaymentBodySchema,
  verifyEsewaPaymentQuerySchema,
  paymentStatusParamsSchema,
};
