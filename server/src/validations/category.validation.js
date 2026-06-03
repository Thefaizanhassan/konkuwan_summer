const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().optional().allow('', null),
  parent_id: Joi.number().integer().optional().allow(null),
});

const updateCategorySchema = createCategorySchema.fork(
  Object.keys(createCategorySchema.describe().keys),
  (schema) => schema.optional()
).min(1);

module.exports = { createCategorySchema, updateCategorySchema };