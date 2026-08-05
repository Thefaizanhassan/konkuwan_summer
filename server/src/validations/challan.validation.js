const Joi = require('joi');

const CHALLAN_TYPES = ['farmer_to_warehouse', 'warehouse_transfer'];

// `.empty(Joi.valid('', null))` collapses blanks to undefined before `.or()`
// looks at them — `.or()` only tests key presence, so without it a line with an
// empty name would pass validation and reach the database with no product.
const challanItemSchema = Joi.object({
  product_id: Joi.string().uuid().empty(Joi.valid('', null)).optional(),
  product_name: Joi.string().trim().empty(Joi.valid('', null)).max(200).optional(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().max(50).default('kg'),
  purchase_rate: Joi.number().min(0).required(),
})
  .or('product_id', 'product_name')
  // Without its own message this inherits the farmer message from the
  // conditional below, which reads as nonsense on a line item.
  .messages({ 'object.missing': 'Each line needs a product, or a name if you chose Other.' });
 
// Two workflows share one table, so the required fields differ by type:
//
//   farmer_to_warehouse  a farmer supplies goods into a warehouse. Needs a
//                        farmer — either linked or free-text — and a
//                        destination warehouse.
//   warehouse_transfer   stock moves between warehouses. Needs both ends, and
//                        they must differ.
//
// challan_type defaults to farmer_to_warehouse so payloads written before this
// change keep validating: the previous client sends no type at all.
const createChallanSchema = Joi.object({
  challan_type: Joi.string().valid(...CHALLAN_TYPES).default('farmer_to_warehouse'),
  challan_date: Joi.date().iso().optional(),
 
  // Procurement. Blanks collapse to undefined for the same reason as above:
  // the `.or('farmer_id', 'farmer_name')` below must not be satisfied by a
  // field the user left empty.
  farmer_id: Joi.string().uuid().empty(Joi.valid('', null)).optional(),
  // farmer_name alone is deliberately valid: "Other" records a supplier
  // without creating a permanent farmer record.
  farmer_name: Joi.string().trim().empty(Joi.valid('', null)).max(120).optional(),
  farmer_address: Joi.string().trim().empty(Joi.valid('', null)).max(500).optional(),
 
  // Warehouses
  source_warehouse_id: Joi.string().uuid().empty(Joi.valid('', null)).optional(),
  destination_warehouse_id: Joi.string().uuid().empty(Joi.valid('', null)).optional(),

  challan_charges: Joi.number().min(0).default(0),
  notes: Joi.string().optional().allow('', null),
  items: Joi.array().items(challanItemSchema).min(1).required(),
})
  // A transfer needs both warehouses, and they must be different places.
  // .required() matters: without it an absent challan_type also satisfies
  // valid('warehouse_transfer'), and legacy payloads that send no type at all
  // would be pushed down the transfer branch and rejected.
  .when(Joi.object({ challan_type: Joi.string().valid('warehouse_transfer').required() }).unknown(), {
    then: Joi.object({
      source_warehouse_id: Joi.string().uuid().required().messages({
        'any.required': 'A source warehouse is required for a warehouse transfer.',
      }),
      destination_warehouse_id: Joi.string()
        .uuid()
        .required()
        .invalid(Joi.ref('source_warehouse_id'))
        .messages({
          'any.required': 'A destination warehouse is required for a warehouse transfer.',
          'any.invalid': 'The source and destination warehouses must be different.',
        }),
    }),
    // Procurement needs a farmer, one way or the other.
    otherwise: Joi.object({})
      .or('farmer_id', 'farmer_name')
      .messages({
        'object.missing': 'Select a farmer, or choose Other and enter a name.',
      }),
  });
 
module.exports = { createChallanSchema, CHALLAN_TYPES };