const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');

const SALT_ROUNDS = 12;

// ── Password helpers ──
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

const comparePasswords = async (plain, hash) => {
  return bcrypt.compare(plain, hash);
};

// ── Token generation ──
const generateAccessToken = (user) => {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
  };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expireIn,
  });
};

const generateRefreshToken = (user) => {
  const payload = {
    sub: user.id,
    type: 'refresh',
  };
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpireIn,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};

module.exports = {
  hashPassword,
  comparePasswords,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};