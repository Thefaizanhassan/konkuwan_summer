const Joi = require('joi');
 
const challanItemSchema = Joi.object({
  product_id: Joi.string().uuid().optional().allow(null, ''),
  product_name: Joi.string().max(200).optional().allow('', null),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().max(50).default('kg'),
  purchase_rate: Joi.number().min(0).required(),
}).or('product_id', 'product_name');
 
const createChallanSchema = Joi.object({
  challan_date: Joi.date().iso().optional(),
  farmer_id: Joi.string().uuid().optional().allow(null, ''),
  farmer_name: Joi.string().max(120).optional().allow('', null),
  challan_charges: Joi.number().min(0).default(0),
  notes: Joi.string().optional().allow('', null),
  items: Joi.array().items(challanItemSchema).min(1).required(),
});
 
module.exports = { createChallanSchema };