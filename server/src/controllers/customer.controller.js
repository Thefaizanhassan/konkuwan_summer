const { Customer } = require('../models');
const { createCustomerSchema, updateCustomerSchema } = require('../validations/customer.validation');
const AppError = require('../utils/AppError');

// Admin: list customers
exports.getAllCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const where = {};
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { company_name: { [Op.iLike]: `%${search}%` } },
        { contact_person: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const offset = (page - 1) * limit;
    const { count, rows } = await Customer.findAndCountAll({
      where,
      order: [['company_name', 'ASC']],
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

exports.getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return next(new AppError('Customer not found.', 404));
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const { error, value } = createCustomerSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));
    const customer = await Customer.create(value);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return next(new AppError('Customer not found.', 404));
    const { error, value } = updateCustomerSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));
    await customer.update(value);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return next(new AppError('Customer not found.', 404));
    // Consider soft delete? For now hard delete, but orders reference customer, so ON DELETE RESTRICT will block if orders exist.
    await customer.destroy();
    res.json({ success: true, message: 'Customer deleted.' });
  } catch (err) {
    next(err);
  }
};