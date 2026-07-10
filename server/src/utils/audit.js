// const { AuditLog } = require('../models');
const supabase = require('../config/supabaseAdmin');
// Write one audit_logs row. Never throws — a failed audit write must not
// break the main operation.
const log = async ({ user, action, entity_type, entity_id, old_values, new_values, ip_address }) => {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: user ? user.id : null,
      action,
      entity_type,
      entity_id: entity_id ? String(entity_id) : null,
      old_values: old_values || null,
      new_values: new_values || null,
      ip_address: ip_address || null,
    });
    if (error) console.error('Audit logging failed:', error.message);
  } catch (err) {
    console.error('Audit logging failed:', err.message);
  }
};

module.exports = log;