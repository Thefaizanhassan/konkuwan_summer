const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');
 
// Current user's own profile + preferences. Uses the Supabase-backed
// `authenticate` middleware, which puts the profile on req.user.profile.
 
exports.getMe = async (req, res) => {
  res.json({ success: true, data: req.user.profile });
};
 
// PATCH /api/me/preferences — currently just the admin panel language.
exports.updatePreferences = async (req, res, next) => {
  try {
    const { language } = req.body;
    const SUPPORTED = ['en', 'or'];
    if (!SUPPORTED.includes(language)) {
      return next(new AppError(`Unsupported language. Supported: ${SUPPORTED.join(', ')}.`, 400));
    }
 
    const { data, error } = await supabase
      .from('profiles')
      .update({ language, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select()
      .single();
 
    if (error) {
      // The column is added by database/2026-07-13_user_language.sql
      if (/column .*language.* does not exist/i.test(error.message)) {
        return next(new AppError('Database migration missing: run database/2026-07-13_user_language.sql in Supabase (adds profiles.language).', 500));
      }
      return next(new AppError(error.message, 500));
    }
 
    res.json({ success: true, data });
  } catch (err) { next(err); }
};