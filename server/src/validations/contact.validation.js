const Joi = require('joi');
 
const buyerContactSchema = Joi.object({
  name: Joi.string().max(120).required(),
  company: Joi.string().max(200).required(),
  product: Joi.string().max(255).required(),
  quantity: Joi.string().max(100).optional().allow('', null),
  email: Joi.string().email().required(),
  phone: Joi.string().max(30).optional().allow('', null),
});
 
const investorContactSchema = Joi.object({
  name: Joi.string().max(120).required(),
  organisation: Joi.string().max(200).required(),
  interest: Joi.string().max(50).optional().allow('', null),
  email: Joi.string().email().required(),
  message: Joi.string().max(5000).required(),
});
 
const updateContactStatusSchema = Joi.object({
  status: Joi.string().valid('new', 'read', 'replied', 'archived').required(),
});
 
module.exports = { buyerContactSchema, investorContactSchema, updateContactStatusSchema };