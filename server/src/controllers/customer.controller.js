const supabase = require('../config/supabaseAdmin');
const { createCustomerSchema, updateCustomerSchema } = require('../validations/customer.validation');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/audit');
const { orFilter, searchAcross, likeTerm } = require('../utils/pgrst');
const { parsePagination } = require('../utils/pagination');

// "Completed" orders for revenue purposes — the same definition the Finance
// module and dashboard use, so totals agree across the platform.
const COMPLETED_STATUSES = ['confirmed', 'dispatched', 'delivered'];
 
// Sum completed-order value per customer for a set of customer ids
async function purchaseTotals(customerIds) {
  if (!customerIds.length) return {};
  const { data } = await supabase
    .from('orders')
    .select('customer_id, total_amount, status')
    .in('customer_id', customerIds)
    .in('status', COMPLETED_STATUSES);
  const totals = {};
  (data || []).forEach((o) => {
    totals[o.customer_id] = (totals[o.customer_id] || 0) + Number(o.total_amount || 0);
  });
  return totals;
}

exports.getAllCustomers = async (req, res, next) => {
  try {
    const { page, limit, from } = parsePagination(req.query);
    const search = req.query.search;

    let q = supabase.from('customers').select('*', { count: 'exact' });
    if (search) {
      q = q.or(searchAcross(['company_name', 'contact_person', 'email'], search));
    }
    // Works together with search: ?lead_status=active_customer|potential_lead
    if (req.query.lead_status && ['active_customer', 'potential_lead'].includes(req.query.lead_status)) {
      q = q.eq('lead_status', req.query.lead_status);
    }
    q = q.order('company_name', { ascending: true }).range(from, from + limit - 1);

    const { data, count, error } = await q;
    if (error) return next(new AppError(error.message, 500));

    // Total purchase amount per customer, from completed orders
    const totals = await purchaseTotals((data || []).map((c) => c.id));
    const rows = (data || []).map((c) => ({ ...c, total_purchased: totals[c.id] || 0 }));

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) { next(err); }
};

// GET /admin/customers/export — every customer, for CSV export
exports.exportCustomers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('company_name, contact_person, email, phone, address, gstin, lead_status, linkedin_url, notes, created_at')
      .order('company_name', { ascending: true });
    if (error) return next(new AppError(error.message, 500));
    await auditLog({ user: req.user, action: 'EXPORT', entity_type: 'customer', new_values: { exported: (data || []).length }, ip_address: req.ip });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
 
exports.getCustomerById = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('customers').select('*').eq('id', req.params.id).single();
    if (error || !data) return next(new AppError('Customer not found.', 404));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /admin/customers/:id/profile — full account: info + order history +
// purchase totals + per-product quantities (Task 5).
exports.getCustomerProfile = async (req, res, next) => {
  try {
    const { data: customer, error } = await supabase.from('customers').select('*').eq('id', req.params.id).single();
    if (error || !customer) return next(new AppError('Customer not found.', 404));
 
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_date, status, total_amount, invoice_number, quotation_number, items:order_items(quantity, unit, unit_price, final_price, line_total, product:products(id, name, unit))')
      .eq('customer_id', req.params.id)
      .order('order_date', { ascending: false });
 
    const rows = orders || [];
    // Completed orders only — same definition as the customer list column and
    // the finance/dashboard revenue figures, so all screens agree.
    const billable = rows.filter((o) => COMPLETED_STATUSES.includes(o.status));
    const total_purchased = billable.reduce((s, o) => s + Number(o.total_amount || 0), 0);
 
    // Per-product quantity + spend across completed orders
    const productMap = {};
    billable.forEach((o) => {
      (o.items || []).forEach((it) => {
        // Custom lines have no products row, so group them by their name.
        const key = it.product?.id || it.product?.name || it.product_name || 'unknown';
        if (!productMap[key]) {
          productMap[key] = { product: it.product?.name || it.product_name || '—', unit: it.unit || it.product?.unit || 'kg', quantity: 0, spend: 0 };
        }
        productMap[key].quantity += Number(it.quantity || 0);
        productMap[key].spend += Number(it.final_price != null ? it.final_price * it.quantity : it.line_total || 0);
      });
    });
    const products = Object.values(productMap).sort((a, b) => b.spend - a.spend);
 
    res.json({
      success: true,
      data: {
        customer,
        summary: {
          total_orders: rows.length,
          billable_orders: billable.length, // completed orders counted in the total
          total_purchased,
          first_order_date: rows.length ? rows[rows.length - 1].order_date : null,
          last_order_date: rows.length ? rows[0].order_date : null,
        },
        products,
        orders: rows,
      },
    });
  } catch (err) { next(err); }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const { error: vErr, value } = createCustomerSchema.validate(req.body, { stripUnknown: true });
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
    const { data, error } = await supabase.from('customers').insert(value).select().single();
    if (error) return next(new AppError(error.message, 500));
    await auditLog({ user: req.user, action: 'CREATE', entity_type: 'customer', entity_id: data.id, new_values: data, ip_address: req.ip });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    // stripUnknown: the edit form sends the whole row back (id, created_at, …)
    // — strip those instead of failing validation with "id is not allowed".
    const { error: vErr, value } = updateCustomerSchema.validate(req.body, { stripUnknown: true });
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
    const { data: old } = await supabase.from('customers').select('*').eq('id', req.params.id).single();
    const { data, error } = await supabase.from('customers').update(value).eq('id', req.params.id).select().single();
    if (error) return next(new AppError(error.message, 500));
    if (!data) return next(new AppError('Customer not found.', 404));
    await auditLog({ user: req.user, action: 'UPDATE', entity_type: 'customer', entity_id: data.id, old_values: old, new_values: data, ip_address: req.ip });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const { data: old } = await supabase.from('customers').select('*').eq('id', req.params.id).single();
    const { error } = await supabase.from('customers').delete().eq('id', req.params.id);
    if (error) {
      // orders.customer_id is ON DELETE RESTRICT — deleting a customer with
      // orders violates that FK. Explain instead of a generic 500.
      if (error.code === '23503') {
        return next(new AppError('Cannot delete: this customer has orders. Cancel/delete their orders first, or keep the customer for record-keeping.', 409));
      }
      return next(new AppError(error.message, 500));
    }
    await auditLog({ user: req.user, action: 'DELETE', entity_type: 'customer', entity_id: req.params.id, old_values: old, ip_address: req.ip });
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

      // An imported company name or email can contain a comma; interpolating
      // it would restructure the filter rather than search for it.
      const dupConditions = [['company_name', 'ilike', likeTerm(value.company_name)]];
      if (value.email) dupConditions.push(['email', 'ilike', likeTerm(value.email)]);
      const { data: dup } = await supabase.from('customers').select('id').or(orFilter(dupConditions)).limit(1);
      if (dup && dup.length) { summary.skipped++; summary.errors.push({ row: i + 1, company: value.company_name, reason: 'Duplicate (company or email exists)' }); continue; }

      const { error } = await supabase.from('customers').insert(value);
      if (error) { summary.skipped++; summary.errors.push({ row: i + 1, company: value.company_name, reason: error.message }); continue; }
      summary.imported++;
    }
    await auditLog({ user: req.user, action: 'IMPORT', entity_type: 'customer', new_values: { imported: summary.imported, skipped: summary.skipped }, ip_address: req.ip });
    res.status(201).json({ success: true, data: summary });
  } catch (err) { next(err); }
};