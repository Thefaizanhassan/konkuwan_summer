const AppError = require('../utils/AppError');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided. Please log in.', 401));
  }
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error(error?.message || 'Invalid token');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return next(new AppError('User profile not found.', 401));
    }
    if (!profile.is_active) {
      return next(new AppError('Your account has been deactivated.', 401));
    }

    req.user = { ...user, id: user.id, profile };
    next();
  } catch (err) {
    next(new AppError('Invalid or expired token. Please log in again.', 401));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('You must be logged in to perform this action.', 401));
    }
    const userRole = req.user.profile?.role;
    const hasPermission = roles.length === 0 || roles.includes(userRole);
    if (!hasPermission) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

module.exports = { authenticate, authorize };