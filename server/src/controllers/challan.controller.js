const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/audit');
const { createChallanSchema } = require('../validations/challan.validation');
 
const CHALLAN_SELECT =
  '*, farmer:farmers(id,name,village,phone), items:challan_items(*, product:products(id,name,unit)), creator:profiles(name)';

function financialYear(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const startYear = d.getMonth() >= 3 ? y : y - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}
 
exports.getAllChallans = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const from = (page - 1) * limit;
    const { farmer_id, from_date, to_date, search } = req.query;
 
    let q = supabase.from('delivery_challans').select(CHALLAN_SELECT, { count: 'exact' });
    if (farmer_id) q = q.eq('farmer_id', farmer_id);
    if (from_date) q = q.gte('challan_date', from_date);
    if (to_date) q = q.lte('challan_date', to_date);
    if (search) q = q.or(`challan_number.ilike.%${search}%,farmer_name.ilike.%${search}%`);
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
 
    // Snapshot the farmer name (survives if the farmer record is later removed)
    let farmerName = value.farmer_name || null;
    if (value.farmer_id && !farmerName) {
      const { data: f } = await supabase.from('farmers').select('name').eq('id', value.farmer_id).single();
      farmerName = f?.name || null;
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
        farmer_id: value.farmer_id || null,
        farmer_name: farmerName,
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
          phone: challan.farmer?.phone || '',
        },
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