const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../services/auth.service');
const { User, Role } = require('../models');
// new peice of code
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // never exposed
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next(new AppError('No token provided.', 401));
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw error;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profile || !profile.is_active) return next(new AppError('Account deactivated.', 401));
    req.user = { ...user, profile };
    next();
  } catch (err) {
    next(new AppError('Invalid token.', 401));
  }
};

// below part may need to be removed
/**
 * Protect routes - only logged-in users
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Get token from header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to access this resource.', 401));
    }

    // 2. Verify token
    const decoded = verifyAccessToken(token);

    // 3. Find user
    const user = await User.findByPk(decoded.sub, {
      include: Role, // eager load roles
    });

    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 4. Check if user is active
    if (!user.is_active) {
      return next(new AppError('Your account has been deactivated. Please contact an administrator.', 401));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token. Please log in again.', 401));
    }
    next(err);
  }
};

/**
 * Role-based authorization
 * @param  {...string} roles - allowed roles (e.g., 'super_admin', 'order_manager')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('You must be logged in to perform this action.', 401));
    }

    const userRoleNames = req.user.Roles.map((role) => role.name);
    const hasPermission = roles.some((role) => userRoleNames.includes(role));

    if (!hasPermission) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
  };
};

module.exports = { authenticate, authorize };