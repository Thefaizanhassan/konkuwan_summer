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

// POST /api/admin/customers/import  — body: { customers: [...] }
// Parses are done client-side (PapaParse); this endpoint validates + dedupes.
exports.importCustomers = async (req, res, next) => {
  try {
    const { customers } = req.body;
    if (!Array.isArray(customers) || customers.length === 0) {
      return next(new AppError('Request body must contain a non-empty "customers" array.', 400));
    }
    if (customers.length > 1000) {
      return next(new AppError('Maximum 1000 customers per import.', 400));
    }

    const { Op } = require('sequelize');
    const summary = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < customers.length; i++) {
      const row = customers[i];
      const { error, value } = createCustomerSchema.validate(row, { stripUnknown: true });
      if (error) {
        summary.skipped++;
        summary.errors.push({ row: i + 1, company: row.company_name || '—', reason: error.details[0].message });
        continue;
      }
      // Duplicate check: same company_name (case-insensitive) OR same non-empty email
      const dupWhere = [{ company_name: { [Op.iLike]: value.company_name } }];
      if (value.email) dupWhere.push({ email: { [Op.iLike]: value.email } });
      const existing = await Customer.findOne({ where: { [Op.or]: dupWhere } });
      if (existing) {
        summary.skipped++;
        summary.errors.push({ row: i + 1, company: value.company_name, reason: 'Duplicate (company name or email already exists)' });
        continue;
      }
      await Customer.create(value);
      summary.imported++;
    }

    res.status(201).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};