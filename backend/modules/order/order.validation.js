import { Joi } from "../../utils/serviceValidation.js";

const positiveId = Joi.number().integer().positive();

const vendorParamsSchema = Joi.object({
  vendorId: positiveId.required(),
});

const orderParamsSchema = Joi.object({
  orderId: positiveId.required(),
});

const orderItemSchema = Joi.object({
  id: positiveId.required(),
  quantity: Joi.number().integer().min(1).max(100).optional(),
});

const createCustomerOrderBodySchema = Joi.object({
  vendor_id: positiveId.required(),
  table_identifier: Joi.string().trim().allow("", null).max(120).optional(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
}).unknown(true);

const createOrderBodySchema = Joi.object({
  vendorId: positiveId.required(),
  tableId: Joi.alternatives()
    .try(positiveId, Joi.string().trim().valid(""), Joi.valid(null))
    .optional(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
  totalAmount: Joi.number().min(0).precision(2).optional(),
}).unknown(true);

const updateOrderStatusBodySchema = Joi.object({
  status: Joi.string().trim().required(),
});

const updatePaymentStatusBodySchema = Joi.object({
  paymentStatus: Joi.string().trim().max(32).optional(),
  paymentMethod: Joi.string().trim().max(32).optional(),
  transactionId: Joi.string().trim().max(255).optional(),
})
  .or("paymentStatus", "paymentMethod", "transactionId")
  .required();

const reportDeliveryIssueBodySchema = Joi.object({
  issueDescription: Joi.string().trim().allow("", null).max(500).optional(),
}).unknown(true);

const resolveDeliveryIssueBodySchema = Joi.object({
  resolutionMessage: Joi.string().trim().allow("", null).max(500).optional(),
}).unknown(true);

export {
  vendorParamsSchema,
  orderParamsSchema,
  createCustomerOrderBodySchema,
  createOrderBodySchema,
  updateOrderStatusBodySchema,
  updatePaymentStatusBodySchema,
  reportDeliveryIssueBodySchema,
  resolveDeliveryIssueBodySchema,
};
