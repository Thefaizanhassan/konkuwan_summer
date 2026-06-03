const Joi = require('joi');

const createCustomerSchema = Joi.object({
  company_name: Joi.string().max(200).required(),
  contact_person: Joi.string().max(120).optional().allow('', null),
  email: Joi.string().email().optional().allow('', null),
  phone: Joi.string().max(20).optional().allow('', null),
  address: Joi.string().optional().allow('', null),
  gstin: Joi.string().max(30).optional().allow('', null),
  notes: Joi.string().optional().allow('', null),
});

const updateCustomerSchema = createCustomerSchema.fork(
  Object.keys(createCustomerSchema.describe().keys),
  (schema) => schema.optional()
).min(1);

module.exports = { createCustomerSchema, updateCustomerSchema };