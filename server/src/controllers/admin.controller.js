const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { User, Role } = require('../models');
const { hashPassword } = require('../services/auth.service');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/audit');

// Helper to include roles
const includeRoles = { model: Role, through: { attributes: [] } };

exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      include: includeRoles,
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: includeRoles,
    });
    if (!user) return next(new AppError('User not found.', 404));
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role_ids } = req.body;
    if (!name || !email || !password) {
      return next(new AppError('Name, email, and password are required.', 400));
    }

    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) return next(new AppError('Email already in use.', 400));

    const password_hash = await hashPassword(password);
    const user = await User.create({ name, email, password_hash, is_active: true });

    // Assign roles
    if (role_ids && role_ids.length > 0) {
      const roles = await Role.findAll({ where: { id: role_ids } });
      await user.setRoles(roles);
    }

    // Audit
    await auditLog({
      user: req.user,
      action: 'CREATE',
      entity_type: 'user',
      entity_id: user.id,
      new_values: { name, email, role_ids },
    });

    const fullUser = await User.findByPk(user.id, { include: includeRoles });
    res.status(201).json({ success: true, data: fullUser });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return next(new AppError('User not found.', 404));

    const { name, email, is_active, role_ids, password } = req.body;
    const oldValues = {
      name: user.name,
      email: user.email,
      is_active: user.is_active,
      roles: (await user.getRoles()).map(r => r.id),
    };

    if (name) user.name = name;
    if (email) {
      const existing = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
      if (existing) return next(new AppError('Email already in use.', 400));
      user.email = email;
    }
    if (is_active !== undefined) user.is_active = is_active;
    if (password) {
      user.password_hash = await hashPassword(password);
    }
    await user.save();

    // Update roles
    if (role_ids) {
      const roles = await Role.findAll({ where: { id: role_ids } });
      await user.setRoles(roles);
    }

    // Audit
    await auditLog({
      user: req.user,
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: user.id,
      old_values: oldValues,
      new_values: { name, email, is_active, role_ids },
    });

    const updatedUser = await User.findByPk(user.id, { include: includeRoles });
    res.json({ success: true, data: updatedUser });
  } catch (err) {
    next(err);
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return next(new AppError('User not found.', 404));
    user.is_active = false;
    await user.save();
    await auditLog({
      user: req.user,
      action: 'DEACTIVATE',
      entity_type: 'user',
      entity_id: user.id,
      old_values: { is_active: true },
      new_values: { is_active: false },
    });
    res.json({ success: true, message: 'User deactivated.' });
  } catch (err) {
    next(err);
  }
};