const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/audit');
const { orFilter, requireUuid } = require('../utils/pgrst');
const {
  createWarehouseSchema,
  updateWarehouseSchema,
} = require('../validations/warehouse.validation');
 
const SELECT =
  'id, name, code, address, city, state, pincode, contact_person, phone, is_active, notes, created_at';
 
// A warehouse whose name already exists (case-insensitively) hits the unique
// index. Translate that into something a user can act on.
const isDuplicateName = (error) =>
  error && (error.code === '23505' || /warehouses_name_unique/i.test(error.message || ''));
 
exports.list = async (req, res, next) => {
  try {
    // ?active=true is what the challan form uses — a deactivated warehouse
    // should not appear as a destination for new movements.
    let q = supabase.from('warehouses').select(SELECT).order('name');
    if (req.query.active === 'true') q = q.eq('is_active', true);
 
    const { data, error } = await q;
    if (error) return next(new AppError(error.message, 500));
    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};
 
exports.getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select(SELECT)
      .eq('id', req.params.id)
      .single();
    if (error || !data) return next(new AppError('Warehouse not found.', 404));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
 
exports.create = async (req, res, next) => {
  try {
    const { error: vErr, value } = createWarehouseSchema.validate(req.body, {
      stripUnknown: true,
    });
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
 
    const { data, error } = await supabase
      .from('warehouses')
      .insert({ ...value, created_by: req.user.id })
      .select(SELECT)
      .single();
 
    if (isDuplicateName(error)) {
      return next(new AppError(`A warehouse named "${value.name}" already exists.`, 409));
    }
    if (error) return next(new AppError(error.message, 500));
 
    await auditLog({
      user: req.user,
      action: 'CREATE',
      entity_type: 'warehouse',
      entity_id: data.id,
      new_values: { name: data.name },
      ip_address: req.ip,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
 
exports.update = async (req, res, next) => {
  try {
    const { error: vErr, value } = updateWarehouseSchema.validate(req.body, {
      stripUnknown: true,
    });
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
 
    const { data, error } = await supabase
      .from('warehouses')
      .update({ ...value, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(SELECT)
      .single();
 
    if (isDuplicateName(error)) {
      return next(new AppError(`A warehouse named "${value.name}" already exists.`, 409));
    }
    if (error) return next(new AppError(error.message, 500));
    if (!data) return next(new AppError('Warehouse not found.', 404));
 
    await auditLog({
      user: req.user,
      action: 'UPDATE',
      entity_type: 'warehouse',
      entity_id: data.id,
      new_values: value,
      ip_address: req.ip,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
 
// Deactivate rather than delete. Challans reference warehouses with ON DELETE
// RESTRICT, so a hard delete would fail the moment the warehouse has any
// history — and that history is the point of the module.
exports.deactivate = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(SELECT)
      .single();
    if (error) return next(new AppError(error.message, 500));
    if (!data) return next(new AppError('Warehouse not found.', 404));
 
    await auditLog({
      user: req.user,
      action: 'DEACTIVATE',
      entity_type: 'warehouse',
      entity_id: data.id,
      new_values: { is_active: false, name: data.name },
      ip_address: req.ip,
    });
    res.json({ success: true, message: 'Warehouse deactivated.', data });
  } catch (err) {
    next(err);
  }
};
 
// Hard delete, allowed only while the warehouse has never been used.
exports.remove = async (req, res, next) => {
  try {
    const { count } = await supabase
      .from('delivery_challans')
      .select('id', { count: 'exact', head: true })
      .or(orFilter([
        ['source_warehouse_id', 'eq', requireUuid(req.params.id, 'id')],
        ['destination_warehouse_id', 'eq', req.params.id],
      ]));
 
    if (count > 0) {
      return next(
        new AppError(
          `This warehouse appears on ${count} challan${count === 1 ? '' : 's'} and cannot be deleted. ` +
            'Deactivate it instead — it will stop appearing on new challans while its history is kept.',
          409
        )
      );
    }
 
    const { data: existing } = await supabase
      .from('warehouses')
      .select('name')
      .eq('id', req.params.id)
      .single();
    if (!existing) return next(new AppError('Warehouse not found.', 404));
 
    const { error } = await supabase.from('warehouses').delete().eq('id', req.params.id);
    if (error) return next(new AppError(error.message, 500));
 
    await auditLog({
      user: req.user,
      action: 'DELETE',
      entity_type: 'warehouse',
      entity_id: req.params.id,
      new_values: { name: existing.name },
      ip_address: req.ip,
    });
    res.json({ success: true, message: 'Warehouse deleted.' });
  } catch (err) {
    next(err);
  }
};