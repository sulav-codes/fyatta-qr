import { Joi } from "../../utils/serviceValidation.js";

const positiveId = Joi.number().integer().positive();

const callWaiterBodySchema = Joi.object({
  vendor_id: positiveId.required(),
  table_identifier: Joi.string().trim().min(1).max(120).required(),
  table_name: Joi.string().trim().max(120).allow("", null).optional(),
}).unknown(false);

export { callWaiterBodySchema };
