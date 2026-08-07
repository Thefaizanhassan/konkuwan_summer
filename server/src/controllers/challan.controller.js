const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/audit');
const { createChallanSchema } = require('../validations/challan.validation');
const { orFilter, searchAcross, requireUuid } = require('../utils/pgrst');
const { parsePagination } = require('../utils/pagination');
 
const CHALLAN_SELECT =
  '*, farmer:farmers(id,name,village,block,address,phone), ' +
  'source_warehouse:warehouses!delivery_challans_source_warehouse_id_fkey(id,name,address,city,state), ' +
  'destination_warehouse:warehouses!delivery_challans_destination_warehouse_id_fkey(id,name,address,city,state), ' +
  'items:challan_items(*, product:products(id,name,unit)), creator:profiles(name)';
 
// Farmers enrolled before `address` existed have only village and block, so
// fall back to those rather than showing an empty address on the challan.
function farmerAddress(farmer, explicit) {
  if (explicit) return explicit;
  if (!farmer) return null;
  return farmer.address || [farmer.village, farmer.block].filter(Boolean).join(', ') || null;
}
 
// A warehouse's printable address: its own address line, else city/state.
function warehouseAddress(w) {
  if (!w) return null;
  return w.address || [w.city, w.state].filter(Boolean).join(', ') || null;
}

function financialYear(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const startYear = d.getMonth() >= 3 ? y : y - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}
 
exports.getAllChallans = async (req, res, next) => {
  try {
    const { page, limit, from } = parsePagination(req.query);
    const { farmer_id, from_date, to_date, search, challan_type, warehouse_id } = req.query;
 
    let q = supabase.from('delivery_challans').select(CHALLAN_SELECT, { count: 'exact' });
    if (farmer_id) q = q.eq('farmer_id', farmer_id);
    if (challan_type) q = q.eq('challan_type', challan_type);
    // Either end of a movement counts as "this warehouse was involved".
    if (warehouse_id) {
      requireUuid(warehouse_id, 'warehouse_id');
      q = q.or(orFilter([
        ['source_warehouse_id', 'eq', warehouse_id],
        ['destination_warehouse_id', 'eq', warehouse_id],
      ]));
    }
    if (from_date) q = q.gte('challan_date', from_date);
    if (to_date) q = q.lte('challan_date', to_date);
    if (search) q = q.or(searchAcross(['challan_number', 'farmer_name'], search));
    q = q.order('challan_date', { ascending: false }).range(from, from + limit - 1);
 
    const { data, count, error } = await q;
    if (error) return next(new AppError(error.message, 500));
    res.json({ success: true, data, pagination: { total: count, page, pages: Math.ceil((count || 0) / limit) } });
  } catch (err) { next(err); }
};
 
exports.getChallanById = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('delivery_challans').select(CHALLAN_SELECT).eq('id', req.params.id).single();
    if (error || !data) return next(new AppError('Challan not found.', 404));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
 
exports.createChallan = async (req, res, next) => {
  try {
    const { error: vErr, value } = createChallanSchema.validate(req.body, { stripUnknown: true });
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
 
    const challanDate = value.challan_date || new Date().toISOString().slice(0, 10);
 
    const isTransfer = value.challan_type === 'warehouse_transfer';
 
    // Snapshot the farmer's name and address onto the challan. Both survive if
    // the farmer record is later edited or removed, which matters because a
    // challan is a document of record. For an "Other" farmer this is the only
    // place the details are stored — no farmer row is created.
    let farmerName = null;
    let farmerAddr = null;
    if (!isTransfer) {
      farmerName = value.farmer_name || null;
      farmerAddr = value.farmer_address || null;
      if (value.farmer_id) {
        const { data: f } = await supabase
          .from('farmers')
          .select('name, village, block, address')
          .eq('id', value.farmer_id)
          .single();
        if (!farmerName) farmerName = f?.name || null;
        if (!farmerAddr) farmerAddr = farmerAddress(f, null);
      }
    }
 
    // Unique challan number: CH/<FY>/<seq>
    const { count } = await supabase.from('delivery_challans').select('id', { count: 'exact', head: true });
    const challanNumber = `CH/${financialYear(challanDate)}/${String((count || 0) + 1).padStart(3, '0')}`;
 
    const goodsValue = value.items.reduce((s, it) => s + it.quantity * it.purchase_rate, 0);
    const charges = Number(value.challan_charges || 0);
 
    const { data: challan, error: cErr } = await supabase
      .from('delivery_challans')
      .insert({
        challan_number: challanNumber,
        challan_date: challanDate,
        challan_type: value.challan_type,
        // A transfer has no farmer; a procurement has no source warehouse.
        farmer_id: isTransfer ? null : value.farmer_id || null,
        farmer_name: farmerName,
        farmer_address: farmerAddr,
        source_warehouse_id: isTransfer ? value.source_warehouse_id : null,
        destination_warehouse_id: value.destination_warehouse_id || null,
        challan_charges: charges,
        goods_value: +goodsValue.toFixed(2),
        total_value: +(goodsValue + charges).toFixed(2),
        notes: value.notes || null,
        created_by: req.user.id,
      })
      .select()
      .single();
    if (cErr) return next(new AppError(cErr.message, 500));
 
    const items = value.items.map((it) => ({
      challan_id: challan.id,
      product_id: it.product_id || null,
      product_name: it.product_name || null,
      quantity: it.quantity,
      unit: it.unit || 'kg',
      purchase_rate: it.purchase_rate,
    }));
    const { error: iErr } = await supabase.from('challan_items').insert(items);
    if (iErr) {
      await supabase.from('delivery_challans').delete().eq('id', challan.id);
      return next(new AppError(iErr.message, 500));
    }
 
    await auditLog({ user: req.user, action: 'CREATE', entity_type: 'challan', entity_id: challan.id, new_values: { challan_number: challanNumber, total_value: challan.total_value }, ip_address: req.ip });
 
    const { data: full } = await supabase.from('delivery_challans').select(CHALLAN_SELECT).eq('id', challan.id).single();
    res.status(201).json({ success: true, data: full });
  } catch (err) { next(err); }
};

// GET /admin/challans/:id/print — challan + company details for the PDF
exports.printChallan = async (req, res, next) => {
  try {
    const { data: challan, error } = await supabase
      .from('delivery_challans').select(CHALLAN_SELECT).eq('id', req.params.id).single();
    if (error || !challan) return next(new AppError('Challan not found.', 404));
 
    const keys = ['company_name', 'company_address', 'company_gstin', 'company_pan', 'company_email', 'company_phone'];
    const { data: rows } = await supabase.from('settings').select('key,value').in('key', keys);
    const s = {};
    (rows || []).forEach((r) => { s[r.key] = r.value; });
 
    res.json({
      success: true,
      data: {
        doc_type: 'challan',
        title: 'Delivery Challan',
        challan_type: challan.challan_type || 'farmer_to_warehouse',
        challan_number: challan.challan_number,
        date: challan.challan_date,
        company: {
          name: s.company_name || 'Konkuwan Herbs Pvt. Ltd.',
          address: s.company_address || 'Baselisahi, Westgate, Puri, Odisha, India - 752001',
          gstin: s.company_gstin || '',
          pan: s.company_pan || '',
          email: s.company_email || 'info@konkuwanherbs.com',
          phone: s.company_phone || '',
        },
        farmer: {
          name: challan.farmer?.name || challan.farmer_name || '—',
          village: challan.farmer?.village || '',
          address: farmerAddress(challan.farmer, challan.farmer_address),
          phone: challan.farmer?.phone || '',
        },
        // `from` and `to` are what the PDF renders, so it does not have to
        // know which workflow produced the challan:
        //   procurement  from = the farmer,          to = destination warehouse
        //   transfer     from = source warehouse,    to = destination warehouse
        from:
          challan.challan_type === 'warehouse_transfer'
            ? {
                name: challan.source_warehouse?.name || '—',
                address: warehouseAddress(challan.source_warehouse),
                kind: 'warehouse',
              }
            : {
                name: challan.farmer?.name || challan.farmer_name || '—',
                address: farmerAddress(challan.farmer, challan.farmer_address),
                phone: challan.farmer?.phone || '',
                kind: 'farmer',
              },
        to: challan.destination_warehouse
          ? {
              name: challan.destination_warehouse.name,
              address: warehouseAddress(challan.destination_warehouse),
              kind: 'warehouse',
            }
          : null,
        items: (challan.items || []).map((it) => ({
          product: it.product?.name || it.product_name || '—',
          quantity: Number(it.quantity),
          unit: it.unit,
          purchase_rate: Number(it.purchase_rate),
          line_total: Number(it.line_total),
        })),
        goods_value: Number(challan.goods_value || 0),
        challan_charges: Number(challan.challan_charges || 0),
        total_value: Number(challan.total_value || 0),
        notes: challan.notes || null,
        created_by: challan.creator?.name || null,
      },
    });
  } catch (err) { next(err); }
};

exports.deleteChallan = async (req, res, next) => {
  try {
    const { data: old } = await supabase.from('delivery_challans').select('*').eq('id', req.params.id).single();
    const { error } = await supabase.from('delivery_challans').delete().eq('id', req.params.id);
    if (error) return next(new AppError(error.message, 500));
    await auditLog({ user: req.user, action: 'DELETE', entity_type: 'challan', entity_id: req.params.id, old_values: old, ip_address: req.ip });
    res.json({ success: true, message: 'Challan deleted.' });
  } catch (err) { next(err); }
};