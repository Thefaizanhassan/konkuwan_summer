// const { AuditLog, User } = require('../models');
// const { Op } = require('sequelize');
const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');

exports.getLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const from = (page - 1) * limit;
    const { entity_type, entity_id, action, user_id } = req.query;
 
    let q = supabase
      .from('audit_logs')
      .select('*, user:profiles(id,name,email)', { count: 'exact' });
 
    if (entity_type) q = q.eq('entity_type', entity_type);
    if (entity_id) q = q.eq('entity_id', entity_id);
    if (action) q = q.eq('action', action);
    if (user_id) q = q.eq('user_id', user_id);
 
    q = q.order('created_at', { ascending: false }).range(from, from + limit - 1);
 
    const { data, count, error } = await q;
    if (error) return next(new AppError(error.message, 500));


    res.json({
      success: true,
      data,
      pagination: {
        total: count,
        page,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};