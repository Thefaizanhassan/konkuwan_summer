const { User, Role } = require('../models');
const authService = require('../services/auth.service');
const { loginSchema } = require('../validations/auth.validation');
const AppError = require('../utils/AppError');

/**
 * POST /api/auth/login
 * Public – returns access + refresh tokens
 */
const login = async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const { email, password } = value;

    // Find user
    const user = await User.findOne({
      where: { email },
      include: Role,
    });

    if (!user) {
      return next(new AppError('Invalid email or password.', 401));
    }

    // Check password
    const isMatch = await authService.comparePasswords(password, user.password_hash);
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401));
    }

    // Check if active
    if (!user.is_active) {
      return next(new AppError('Your account has been deactivated.', 401));
    }

    // Generate tokens
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);

    // Send response
    // Refresh token in httpOnly cookie; access token in JSON body
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.Roles.map((r) => r.name),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Public – uses refresh token from cookie to issue new access token
 */
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return next(new AppError('No refresh token provided.', 401));
    }

    // Verify refresh token
    const decoded = authService.verifyRefreshToken(token);

    // Find user
    const user = await User.findByPk(decoded.sub, {
      include: Role,
    });

    if (!user || !user.is_active) {
      return next(new AppError('Invalid refresh token.', 401));
    }

    // Issue new access token
    const accessToken = authService.generateAccessToken(user);

    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.Roles.map((r) => r.name),
      },
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired refresh token. Please log in again.', 401));
    }
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Protected – returns current user profile
 */
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      roles: req.user.Roles.map((r) => r.name),
    },
  });
};

module.exports = { login, refreshToken, getMe };