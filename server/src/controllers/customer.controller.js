const supabase = require('../config/supabaseAdmin');
const { createCustomerSchema, updateCustomerSchema } = require('../validations/customer.validation');
const AppError = require('../utils/AppError');

exports.getAllCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const from = (page - 1) * limit;

    let q = supabase.from('customers').select('*', { count: 'exact' });
    if (search) {
      q = q.or(`company_name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%`);
    }
    q = q.order('company_name', { ascending: true }).range(from, from + limit - 1);

    const { data, count, error } = await q;
    if (error) return next(new AppError(error.message, 500));

    res.json({
      success: true,
      data,
      pagination: { total: count, page, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) { next(err); }
};

exports.getCustomerById = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('customers').select('*').eq('id', req.params.id).single();
    if (error || !data) return next(new AppError('Customer not found.', 404));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const { error: vErr, value } = createCustomerSchema.validate(req.body);
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
    const { data, error } = await supabase.from('customers').insert(value).select().single();
    if (error) return next(new AppError(error.message, 500));
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const { error: vErr, value } = updateCustomerSchema.validate(req.body);
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
    const { data, error } = await supabase.from('customers').update(value).eq('id', req.params.id).select().single();
    if (error) return next(new AppError(error.message, 500));
    if (!data) return next(new AppError('Customer not found.', 404));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const { error } = await supabase.from('customers').delete().eq('id', req.params.id);
    if (error) return next(new AppError(error.message, 500));
    res.json({ success: true, message: 'Customer deleted.' });
  } catch (err) { next(err); }
};

// CSV import (from the previous round) — Supabase version
exports.importCustomers = async (req, res, next) => {
  try {
    const { customers } = req.body;
    if (!Array.isArray(customers) || customers.length === 0)
      return next(new AppError('Request body must contain a non-empty "customers" array.', 400));
    if (customers.length > 1000) return next(new AppError('Maximum 1000 customers per import.', 400));

    const summary = { imported: 0, skipped: 0, errors: [] };
    for (let i = 0; i < customers.length; i++) {
      const { error: vErr, value } = createCustomerSchema.validate(customers[i], { stripUnknown: true });
      if (vErr) { summary.skipped++; summary.errors.push({ row: i + 1, company: customers[i].company_name || '—', reason: vErr.details[0].message }); continue; }

      const orFilter = value.email
        ? `company_name.ilike.${value.company_name},email.ilike.${value.email}`
        : `company_name.ilike.${value.company_name}`;
      const { data: dup } = await supabase.from('customers').select('id').or(orFilter).limit(1);
      if (dup && dup.length) { summary.skipped++; summary.errors.push({ row: i + 1, company: value.company_name, reason: 'Duplicate (company or email exists)' }); continue; }

      const { error } = await supabase.from('customers').insert(value);
      if (error) { summary.skipped++; summary.errors.push({ row: i + 1, company: value.company_name, reason: error.message }); continue; }
      summary.imported++;
    }
    res.status(201).json({ success: true, data: summary });
  } catch (err) { next(err); }
};