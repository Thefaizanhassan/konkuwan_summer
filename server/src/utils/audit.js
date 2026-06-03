const { AuditLog } = require('../models');

const log = async ({ user, action, entity_type, entity_id, old_values, new_values, ip_address }) => {
  try {
    await AuditLog.create({
      user_id: user ? user.id : null,
      action,
      entity_type,
      entity_id: entity_id ? String(entity_id) : null,
      old_values: old_values || null,
      new_values: new_values || null,
      ip_address: ip_address || null,
    });
  } catch (err) {
    // Log failure but don't crash the main operation
    console.error('Audit logging failed:', err.message);
  }
};

module.exports = log;