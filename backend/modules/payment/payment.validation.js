import { Joi } from "../../utils/serviceValidation.js";

const positiveId = Joi.number().integer().positive();

const initiateEsewaPaymentBodySchema = Joi.object({
  orderId: positiveId.required(),
});

const verifyEsewaPaymentQuerySchema = Joi.object({
  dataParam: Joi.string().trim().optional(),
}).unknown(true);

const paymentStatusParamsSchema = Joi.object({
  orderId: positiveId.required(),
});

export {
  initiateEsewaPaymentBodySchema,
  verifyEsewaPaymentQuerySchema,
  paymentStatusParamsSchema,
};
