import { Joi } from "../../utils/serviceValidation.js";

const positiveId = Joi.number().integer().positive();

const vendorParamsSchema = Joi.object({
  vendorId: positiveId.required(),
});

const vendorStaffParamsSchema = Joi.object({
  vendorId: positiveId.required(),
  staffId: positiveId.required(),
});

const createStaffBodySchema = Joi.object({
  username: Joi.string().trim().min(3).max(40).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
  ownerName: Joi.string().trim().max(100).allow("", null).optional(),
  phone: Joi.string().trim().max(30).allow("", null).optional(),
});

const updateStaffBodySchema = Joi.object({
  username: Joi.string().trim().min(3).max(40).optional(),
  email: Joi.string().trim().email().optional(),
  ownerName: Joi.string().trim().max(100).allow("", null).optional(),
  phone: Joi.string().trim().max(30).allow("", null).optional(),
  isActive: Joi.boolean().truthy("true", "1").falsy("false", "0").optional(),
  password: Joi.string().min(8).max(128).optional(),
})
  .or("username", "email", "ownerName", "phone", "isActive", "password")
  .required();

export {
  vendorParamsSchema,
  vendorStaffParamsSchema,
  createStaffBodySchema,
  updateStaffBodySchema,
};
