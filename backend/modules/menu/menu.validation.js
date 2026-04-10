const { Joi } = require("../../utils/serviceValidation");

const positiveId = Joi.number().integer().positive();

const vendorParamsSchema = Joi.object({
  vendorId: positiveId.required(),
});

const vendorItemParamsSchema = Joi.object({
  vendorId: positiveId.required(),
  itemId: positiveId.required(),
});

const createMenuItemsBodySchema = Joi.object({
  menuItems: Joi.string().trim().required(),
  imageIndexes: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.alternatives().try(
          Joi.number().integer().min(0),
          Joi.string().trim().pattern(/^\d+$/),
        ),
      ),
      Joi.number().integer().min(0),
      Joi.string().trim().pattern(/^\d+$/),
    )
    .optional(),
}).unknown(true);

const updateMenuItemBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  price: Joi.number().positive().max(99999.99).optional(),
  category: Joi.string().trim().min(1).max(50).optional(),
  description: Joi.string().allow("", null).max(1000).optional(),
  isAvailable: Joi.boolean().truthy("true", "1").falsy("false", "0").optional(),
});

module.exports = {
  vendorParamsSchema,
  vendorItemParamsSchema,
  createMenuItemsBodySchema,
  updateMenuItemBodySchema,
};
