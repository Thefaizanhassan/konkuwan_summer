const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

exports.getLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, entity_type, entity_id, action, user_id } = req.query;
    const where = {};
    if (entity_type) where.entity_type = entity_type;
    if (entity_id) where.entity_id = entity_id;
    if (action) where.action = action;
    if (user_id) where.user_id = user_id;

    const offset = (page - 1) * limit;
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};