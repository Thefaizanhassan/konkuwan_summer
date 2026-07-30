const Joi = require('joi');
 
// Used by CSV import (and shareable with the enroll form).
const createFarmerSchema = Joi.object({
  name: Joi.string().max(120).required(),
  village: Joi.string().max(200).optional().allow('', null),
  block: Joi.string().max(200).optional().allow('', null),
  crop: Joi.string().max(50).optional().allow('', null),
  area_decimal: Joi.number().min(0).optional().allow(null),
  seed_date: Joi.date().iso().optional().allow(null, ''),
  phone: Joi.string().max(20).optional().allow('', null),
  farmer_type: Joi.string().valid('connected', 'independent').default('connected'),
});
 
module.exports = { createFarmerSchema };