const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/audit');
const {
  buyerContactSchema,
  investorContactSchema,
  updateContactStatusSchema,
} = require('../validations/contact.validation');
 
// ── PUBLIC: form submissions (no auth) ───────────────────────────────────
 
exports.submitBuyer = async (req, res, next) => {
  try {
    const { error: vErr, value } = buyerContactSchema.validate(req.body, { stripUnknown: true });
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
 
    const { error } = await supabase.from('contact_submissions').insert({
      type: 'buyer',
      name: value.name,
      company: value.company,
      product: value.product,
      quantity: value.quantity || null,
      email: value.email,
      phone: value.phone || null,
    });
    if (error) return next(new AppError(error.message, 500));
    res.status(201).json({ success: true, message: 'Thanks! We will get back within 2 working days.' });
  } catch (err) { next(err); }
};
 
exports.submitInvestor = async (req, res, next) => {
  try {
    const { error: vErr, value } = investorContactSchema.validate(req.body, { stripUnknown: true });
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
 
    const { error } = await supabase.from('contact_submissions').insert({
      type: 'investor',
      name: value.name,
      company: value.organisation,
      interest: value.interest || null,
      email: value.email,
      message: value.message,
    });
    if (error) return next(new AppError(error.message, 500));
    res.status(201).json({ success: true, message: 'Thanks! We will get back within 2 working days.' });
  } catch (err) { next(err); }
};
 
// ── ADMIN: inbox ─────────────────────────────────────────────────────────
 
exports.getSubmissions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const from = (page - 1) * limit;
    const { type, status, search } = req.query;
 
    let q = supabase.from('contact_submissions').select('*', { count: 'exact' });
    if (type) q = q.eq('type', type);
    if (status) q = q.eq('status', status);
    if (search) q = q.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
    q = q.order('created_at', { ascending: false }).range(from, from + limit - 1);
 
    const { data, count, error } = await q;
    if (error) return next(new AppError(error.message, 500));
 
    // Count of unhandled inquiries (for the sidebar/inbox badge)
    const { count: newCount } = await supabase
      .from('contact_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new');
 
    res.json({
      success: true,
      data,
      new_count: newCount || 0,
      pagination: { total: count, page, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) { next(err); }
};
 
exports.updateStatus = async (req, res, next) => {
  try {
    const { error: vErr, value } = updateContactStatusSchema.validate(req.body);
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
 
    const { data, error } = await supabase
      .from('contact_submissions')
      .update({ status: value.status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return next(new AppError(error.message, 500));
    if (!data) return next(new AppError('Submission not found.', 404));
 
    await auditLog({ user: req.user, action: 'UPDATE', entity_type: 'contact', entity_id: data.id, new_values: { status: data.status }, ip_address: req.ip });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
 
exports.deleteSubmission = async (req, res, next) => {
  try {
    const { data: old } = await supabase.from('contact_submissions').select('*').eq('id', req.params.id).single();
    const { error } = await supabase.from('contact_submissions').delete().eq('id', req.params.id);
    if (error) return next(new AppError(error.message, 500));
 
    await auditLog({ user: req.user, action: 'DELETE', entity_type: 'contact', entity_id: req.params.id, old_values: old, ip_address: req.ip });
    res.json({ success: true, message: 'Submission deleted.' });
  } catch (err) { next(err); }
};