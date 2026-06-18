const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');

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
    const rows = settings
      .filter((s) => s && typeof s.key === 'string')
      .map((s) => ({ key: s.key, value: s.value, updated_at: new Date().toISOString() }));

    if (rows.length) {
      const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
      if (error) return next(new AppError(error.message, 500));
    }

    const { data, error: readErr } = await supabase.from('settings').select('*');
    if (readErr) return next(new AppError(readErr.message, 500));
    const result = {};
    (data || []).forEach((s) => { result[s.key] = s.value; });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};