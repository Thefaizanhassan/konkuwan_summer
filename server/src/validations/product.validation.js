const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().max(200).required(),
  botanical_name: Joi.string().max(255).optional().allow('', null),
  description: Joi.string().optional().allow('', null),
  forms: Joi.string().max(255).optional().allow('', null),
  price_min: Joi.number().precision(2).min(0).optional().allow(null),
  price_max: Joi.number().precision(2).min(0).optional().allow(null),
  unit: Joi.string().max(50).default('kg'),
  is_active: Joi.boolean().default(true),
  category_ids: Joi.array().items(Joi.number().integer()).optional(),
});

const updateProductSchema = createProductSchema.fork(
  Object.keys(createProductSchema.describe().keys),
  (schema) => schema.optional()
).min(1); // at least one field must be present

module.exports = { createProductSchema, updateProductSchema };