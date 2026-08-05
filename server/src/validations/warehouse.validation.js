const Joi = require('joi');
 
const baseFields = {
  name: Joi.string().max(120).trim(),
  code: Joi.string().max(20).trim().allow('', null),
  address: Joi.string().max(500).allow('', null),
  city: Joi.string().max(120).allow('', null),
  state: Joi.string().max(120).allow('', null),
  pincode: Joi.string().max(12).allow('', null),
  contact_person: Joi.string().max(120).allow('', null),
  phone: Joi.string().max(20).allow('', null),
  notes: Joi.string().max(1000).allow('', null),
  is_active: Joi.boolean(),
};
 
const createWarehouseSchema = Joi.object({
  ...baseFields,
  name: baseFields.name.required(),
});
 
// Every field optional on update, but at least one must be present — an empty
// PUT is a client bug, not a no-op worth pretending succeeded.
const updateWarehouseSchema = Joi.object(baseFields).min(1);
 
module.exports = { createWarehouseSchema, updateWarehouseSchema };