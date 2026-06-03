const Joi = require('joi');

const orderItemSchema = Joi.object({
  product_id: Joi.string().uuid().required(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().default('kg'),
  unit_price: Joi.number().precision(2).positive().required(),
});

const createOrderSchema = Joi.object({
  customer_id: Joi.string().uuid().required(),
  order_date: Joi.date().iso().optional(),
  status: Joi.string().valid('draft').default('draft'),
  final_note: Joi.string().optional().allow('', null),
  items: Joi.array().items(orderItemSchema).min(1).required(),
});

const updateOrderSchema = Joi.object({
  status: Joi.string().valid('draft', 'confirmed', 'dispatched', 'delivered', 'cancelled').optional(),
  final_note: Joi.string().optional().allow('', null),
}).min(1);

const setFinalPriceSchema = Joi.object({
  final_price: Joi.number().precision(2).positive().required(),
});

module.exports = { createOrderSchema, updateOrderSchema, setFinalPriceSchema };