const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/audit');

exports.getAllSettings = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) return next(new AppError(error.message, 500));
    const result = {};
    (data || []).forEach((s) => { result[s.key] = s.value; });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body; // array of { key, value }
    if (!Array.isArray(settings)) {
      return next(new AppError('Request body must contain a "settings" array.', 400));
    }
    // The Settings screen deliberately exposes an "Other Settings" section for
    // keys outside the known list, so an allow-list would break it. Bound the
    // shape instead, so a single row cannot be used as bulk storage.
    const MAX_KEY = 200;
    const MAX_VALUE_BYTES = 20 * 1024;
    const rows = [];
    for (const s of settings) {
      if (!s || typeof s.key !== 'string' || !s.key.trim()) continue;
      if (s.key.length > MAX_KEY) {
        return next(new AppError(`Setting key "${s.key.slice(0, 40)}…" is too long.`, 400));
      }
      if (JSON.stringify(s.value ?? '').length > MAX_VALUE_BYTES) {
        return next(new AppError(`Value for "${s.key}" exceeds ${MAX_VALUE_BYTES / 1024} kB.`, 400));
      }
      rows.push({ key: s.key.trim(), value: s.value, updated_at: new Date().toISOString() });
    }

    if (rows.length) {
      const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
      if (error) return next(new AppError(error.message, 500));
      const changed = {};
      rows.forEach((r) => { changed[r.key] = r.value; });
      await auditLog({ user: req.user, action: 'UPDATE', entity_type: 'settings', new_values: changed, ip_address: req.ip });
    }

    const { data, error: readErr } = await supabase.from('settings').select('*');
    if (readErr) return next(new AppError(readErr.message, 500));
    const result = {};
    (data || []).forEach((s) => { result[s.key] = s.value; });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};