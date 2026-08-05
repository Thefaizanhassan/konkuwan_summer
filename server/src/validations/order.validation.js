const Joi = require('joi');

// A line identifies its product either from the catalogue or by name. The
// free-text path lets a one-off or seasonal crop be sold without adding it to
// the master product list — challan_items already worked this way.
//
// `.empty('')` on both fields matters: `.or()` only asks whether a key is
// present, so a blank string would otherwise satisfy it and produce a line with
// no product at all. Collapsing blanks to undefined first makes `.or()` mean
// what it reads as. (The DB CHECK order_items_product_identified backs this up,
// but a 400 with a sentence beats a raw constraint violation.)
const orderItemSchema = Joi.object({
  product_id: Joi.string().uuid().empty(Joi.valid('', null)).optional(),
  product_name: Joi.string().trim().empty(Joi.valid('', null)).max(200).optional(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().default('kg'),
  unit_price: Joi.number().precision(2).positive().required(),
})
  .or('product_id', 'product_name')
  .messages({ 'object.missing': 'Each line needs a product, or a name if you chose Other.' });

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