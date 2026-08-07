const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');
const { parsePagination } = require('../utils/pagination');
const auditLog = require('../utils/audit');
 
// The list and the export must agree on what "the current view" means, so the
// filters are applied in one place and both call it.
function applyLogFilters(q, query) {
  const { entity_type, entity_id, action, user_id, from_date, to_date } = query;
  if (entity_type) q = q.eq('entity_type', entity_type);
  if (entity_id) q = q.eq('entity_id', entity_id);
  if (action) q = q.eq('action', action);
  if (user_id) q = q.eq('user_id', user_id);
  if (from_date) q = q.gte('created_at', `${from_date}T00:00:00Z`);
  if (to_date) q = q.lte('created_at', `${to_date}T23:59:59Z`);
  return q;
}

exports.getLogs = async (req, res, next) => {
  try {
    const { page, limit, from } = parsePagination(req.query, { defaultLimit: 30, maxLimit: 200 });

    let q = supabase
      .from('audit_logs')
      .select('*, user:profiles(id,name,email)', { count: 'exact' });

    q = applyLogFilters(q, req.query);
    q = q.order('created_at', { ascending: false }).range(from, from + limit - 1);
 
    const { data, count, error } = await q;
    if (error) return next(new AppError(error.message, 500));


    res.json({
      success: true,
      data,
      pagination: {
        total: count,
        page,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};
 
// GET /api/admin/audit-logs/export
//
// Returns every row matching the CURRENT filters, not just the page on screen —
// exporting one page of thirty would be surprising. Capped, because an audit
// table grows without bound and this runs inside a Worker.
const EXPORT_CAP = 5000;
 
exports.exportLogs = async (req, res, next) => {
  try {
    let q = supabase
      .from('audit_logs')
      .select('created_at, action, entity_type, entity_id, ip_address, old_values, new_values, user:profiles(name,email)', { count: 'exact' });
 
    q = applyLogFilters(q, req.query);
    const { data, count, error } = await q
      .order('created_at', { ascending: false })
      .range(0, EXPORT_CAP - 1);
 
    if (error) return next(new AppError(error.message, 500));
 
    const rows = (data || []).map((l) => ({
      timestamp: l.created_at,
      user: l.user?.name || l.user?.email || '',
      action: l.action || '',
      entity_type: l.entity_type || '',
      entity_id: l.entity_id || '',
      ip_address: l.ip_address || '',
      old_values: l.old_values ? JSON.stringify(l.old_values) : '',
      new_values: l.new_values ? JSON.stringify(l.new_values) : '',
    }));
 
    // Exporting the audit trail is itself an auditable act.
    await auditLog({
      user: req.user,
      action: 'EXPORT',
      entity_type: 'audit_log',
      new_values: { exported: rows.length, filters: req.query },
      ip_address: req.ip,
    });
 
    res.json({
      success: true,
      data: rows,
      // The client warns when the cap bit, so nobody assumes a partial export
      // is the whole record.
      truncated: (count || 0) > rows.length,
      total: count || rows.length,
    });
  } catch (err) { next(err); }
};