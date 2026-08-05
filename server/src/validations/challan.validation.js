const Joi = require('joi');

const CHALLAN_TYPES = ['farmer_to_warehouse', 'warehouse_transfer'];

const challanItemSchema = Joi.object({
  product_id: Joi.string().uuid().optional().allow(null, ''),
  product_name: Joi.string().max(200).optional().allow('', null),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().max(50).default('kg'),
  purchase_rate: Joi.number().min(0).required(),
}).or('product_id', 'product_name');
 
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
 
  // Procurement
  farmer_id: Joi.string().uuid().optional().allow(null, ''),
  // farmer_name alone is deliberately valid: "Other" records a supplier
  // without creating a permanent farmer record.
  farmer_name: Joi.string().max(120).optional().allow('', null),
  farmer_address: Joi.string().max(500).optional().allow('', null),
 
  // Warehouses
  source_warehouse_id: Joi.string().uuid().optional().allow(null, ''),
  destination_warehouse_id: Joi.string().uuid().optional().allow(null, ''),

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