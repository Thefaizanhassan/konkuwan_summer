const Joi = require('joi');

const createCustomerSchema = Joi.object({
  company_name: Joi.string().max(200).required(),
  contact_person: Joi.string().max(120).optional().allow('', null),
  email: Joi.string().email().optional().allow('', null),
  phone: Joi.string().max(20).optional().allow('', null),
  address: Joi.string().optional().allow('', null),
  gstin: Joi.string().max(30).optional().allow('', null),
  notes: Joi.string().optional().allow('', null),
  lead_status: Joi.string().valid('active_customer', 'potential_lead').default('active_customer'),
  // scheme:[] matters — a bare .uri() accepts javascript: and the value is
  // rendered as an href on the customer profile.
  linkedin_url: Joi.string().uri({ scheme: ['http', 'https'] }).max(500).optional().allow('', null)
    .messages({ 'string.uriCustomScheme': 'LinkedIn URL must start with http:// or https://.' }),
});

const updateCustomerSchema = createCustomerSchema.fork(
  Object.keys(createCustomerSchema.describe().keys),
  (schema) => schema.optional()
).min(1);

module.exports = { createCustomerSchema, updateCustomerSchema };