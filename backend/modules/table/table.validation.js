const { Joi } = require("../../utils/serviceValidation");

const positiveId = Joi.number().integer().positive();

const vendorParamsSchema = Joi.object({
  vendorId: positiveId.required(),
});

const vendorTableParamsSchema = Joi.object({
  vendorId: positiveId.required(),
  tableId: positiveId.required(),
});

const tableStatusParamsSchema = Joi.object({
  vendorId: positiveId.required(),
  tableIdentifier: Joi.string().trim().min(1).required(),
});

const createTableBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(60).required(),
});

const updateTableBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(60).optional(),
  isActive: Joi.boolean().truthy("true", "1").falsy("false", "0").optional(),
})
  .or("name", "isActive")
  .required();

module.exports = {
  vendorParamsSchema,
  vendorTableParamsSchema,
  tableStatusParamsSchema,
  createTableBodySchema,
  updateTableBodySchema,
};
