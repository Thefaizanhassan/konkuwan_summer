const { createClient } = require('@supabase/supabase-js');
const AppError = require('../utils/AppError');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('You are not logged in. Please log in to access this resource.', 401));
  }
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw error;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) return next(new AppError('User profile not found.', 401));
    if (!profile.is_active) return next(new AppError('Your account has been deactivated.', 401));
    req.user = { ...user, profile };
    next();
  } catch (err) {
    next(new AppError('Invalid or expired token.', 401));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Not authenticated.', 401));
    if (!roles.includes(req.user.profile.role)) return next(new AppError('Insufficient permissions.', 403));
    next();
  };
};

module.exports = { authenticate, authorize };