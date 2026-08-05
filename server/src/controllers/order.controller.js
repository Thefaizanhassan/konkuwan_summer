const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/audit');
const {
  createOrderSchema,
  updateOrderSchema,
  setFinalPriceSchema,
} = require('../validations/order.validation');

const ORDER_SELECT =
  '*, customer:customers(*), items:order_items(*, product:products(id,name,slug,unit,hsn_code))';
 
// A line is either a catalogue product or a free-text one. Everything that
// renders a line — invoice, quotation, order detail — must agree on which
// name wins, so it is resolved in one place.
const lineName = (it) => it.product?.name || it.product_name || '—';

// Fetch several settings rows as a plain map { key: value }
async function getSettings(keys) {
  const { data } = await supabase.from('settings').select('key,value').in('key', keys);
  const map = {};
  (data || []).forEach((r) => { map[r.key] = r.value; });
  return map;
}
 
// Indian financial year label for a date, e.g. 2026-04-10 -> "2026-27"
function financialYear(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const startYear = d.getMonth() >= 3 ? y : y - 1; // FY starts April (month index 3)
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}
 
// Next sequential number for a given order column (invoice_number/quotation_number)
async function nextSequence(column) {
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .not(column, 'is', null);
  return (count || 0) + 1;
}
 
// Shared "billed by" company block + bank + terms, from settings
function companyBlock(s) {
  return {
    name: s.company_name || 'Konkuwan Herbs Pvt. Ltd.',
    address: s.company_address || 'Baselisahi, Westgate, Puri, Odisha, India - 752001',
    gstin: s.company_gstin || '',
    pan: s.company_pan || '',
    email: s.company_email || 'info@konkuwanherbs.com',
    phone: s.company_phone || '',
  };
}

exports.getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const from = (page - 1) * limit;
    const { status, customer_id, from_date, to_date } = req.query;
    const sort = req.query.sort || 'order_date';
    const ascending = (req.query.order || 'DESC').toUpperCase() === 'ASC';

    let q = supabase.from('orders').select(ORDER_SELECT, { count: 'exact' });
    if (status) q = q.eq('status', status);
    if (customer_id) q = q.eq('customer_id', customer_id);
    if (from_date) q = q.gte('order_date', from_date);
    if (to_date) q = q.lte('order_date', to_date);
    q = q.order(sort, { ascending }).range(from, from + limit - 1);

    const { data, count, error } = await q;
    if (error) return next(new AppError(error.message, 500));

    // Normalize embedded "customer" -> "Customer" to match existing frontend accessors
    const rows = (data || []).map((o) => ({ ...o, Customer: o.customer }));
    res.json({ success: true, data: rows, pagination: { total: count, page, pages: Math.ceil((count || 0) / limit) } });
  } catch (err) { next(err); }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', req.params.id).single();
    if (error || !data) return next(new AppError('Order not found.', 404));
    res.json({ success: true, data: { ...data, Customer: data.customer } });
  } catch (err) { next(err); }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { error: vErr, value } = createOrderSchema.validate(req.body);
    if (vErr) return next(new AppError(vErr.details[0].message, 400));

    // total_amount = sum(quantity * unit_price); line_total is computed by the DB
    const total = value.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        customer_id: value.customer_id,
        order_date: value.order_date || new Date().toISOString().slice(0, 10),
        status: value.status || 'draft',
        final_note: value.final_note || null,
        total_amount: total,
      })
      .select()
      .single();
    if (oErr) return next(new AppError(oErr.message, 500));

    const items = value.items.map((it) => ({
      order_id: order.id,
      product_id: it.product_id || null,
      product_name: it.product_id ? null : (it.product_name || null),
      quantity: it.quantity,
      unit: it.unit || 'kg',
      unit_price: it.unit_price,
      // NOTE: do NOT set line_total — it is GENERATED ALWAYS in the schema
    }));
    const { error: iErr } = await supabase.from('order_items').insert(items);
    if (iErr) {
      // roll back the order so we don't leave an empty shell
      await supabase.from('orders').delete().eq('id', order.id);
      return next(new AppError(iErr.message, 500));
    }

    const { data: full } = await supabase.from('orders').select(ORDER_SELECT).eq('id', order.id).single();
    await auditLog({ user: req.user, action: 'CREATE', entity_type: 'order', entity_id: order.id, new_values: { customer_id: order.customer_id, status: order.status, total_amount: order.total_amount, items: items.length }, ip_address: req.ip });
    res.status(201).json({ success: true, data: full });
  } catch (err) { next(err); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { error: vErr, value } = updateOrderSchema.validate(req.body);
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
    const patch = { ...value, updated_at: new Date().toISOString() };
    const { data: old } = await supabase.from('orders').select('id,status,total_amount').eq('id', req.params.id).single();
    const { data, error } = await supabase.from('orders').update(patch).eq('id', req.params.id).select().single();
    if (error) return next(new AppError(error.message, 500));
    if (!data) return next(new AppError('Order not found.', 404));
    await auditLog({ user: req.user, action: 'UPDATE', entity_type: 'order', entity_id: data.id, old_values: old, new_values: { status: data.status }, ip_address: req.ip });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.setItemFinalPrice = async (req, res, next) => {
  try {
    const { error: vErr, value } = setFinalPriceSchema.validate(req.body);
    if (vErr) return next(new AppError(vErr.details[0].message, 400));

    const { data: item, error: iErr } = await supabase
      .from('order_items')
      .update({ final_price: value.final_price })
      .eq('id', req.params.itemId)
      .eq('order_id', req.params.id)
      .select()
      .single();
    if (iErr || !item) return next(new AppError('Order item not found.', 404));

    // Recompute order total using final_price where present, else line_total
    const { data: allItems } = await supabase.from('order_items').select('*').eq('order_id', req.params.id);
    const total = (allItems || []).reduce(
      (s, it) => s + Number(it.final_price != null ? it.final_price : it.line_total), 0
    );
    await supabase.from('orders').update({ total_amount: total, updated_at: new Date().toISOString() }).eq('id', req.params.id);

    await auditLog({ user: req.user, action: 'UPDATE', entity_type: 'order', entity_id: req.params.id, new_values: { item_id: item.id, final_price: item.final_price, new_total: total }, ip_address: req.ip });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
};

// Invoice JSON (consumed by the client PDF generator).
// Matches the sample layout: Billed By/To, per-item GST rate + IGST + HSN,
// shipping, bank details, terms. Tax % and due days come from Settings (bug fix).
exports.generateInvoice = async (req, res, next) => {
  try {
    const { data: order, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', req.params.id).single();
    if (error || !order) return next(new AppError('Order not found.', 404));

    const s = await getSettings([
      'company_name', 'company_address', 'company_gstin', 'company_pan', 'company_email', 'company_phone',
      'bank_account_name', 'bank_account_number', 'bank_ifsc', 'bank_account_type', 'bank_name',
      'invoice_terms', 'invoice_tax_percent', 'invoice_due_days',
    ]);
 
    // Settings-driven tax % and payment-due days (Task 8 fix)
    const taxPercent = parseFloat(s.invoice_tax_percent) || 0;
    const dueDays = parseInt(s.invoice_due_days, 10);
    const dueOffset = Number.isFinite(dueDays) ? dueDays : 30;
 
    // Assign a stable, sequential invoice number the first time (persisted)
    let invoiceNumber = order.invoice_number;
    let invoiceDate = order.invoice_date || order.order_date;
    if (!invoiceNumber) {
      const seq = await nextSequence('invoice_number');
      invoiceNumber = `KON/${financialYear(invoiceDate)}/${String(seq).padStart(2, '0')}`;
      await supabase.from('orders').update({ invoice_number: invoiceNumber, invoice_date: invoiceDate }).eq('id', order.id);
      await auditLog({ user: req.user, action: 'INVOICE', entity_type: 'order', entity_id: order.id, new_values: { invoice_number: invoiceNumber }, ip_address: req.ip });
    }
 
    const due = new Date(invoiceDate);
    due.setDate(due.getDate() + dueOffset);
 
    const items = (order.items || []).map((it) => {
      const rate = it.final_price != null ? Number(it.final_price) : Number(it.unit_price);
      const amount = Number(it.quantity) * rate;
      const igst = +(amount * taxPercent / 100).toFixed(2);
      return {
        product: lineName(it),
        hsn: it.product?.hsn_code || null,
        quantity: Number(it.quantity),
        unit: it.unit,
        rate,
        amount: +amount.toFixed(2),
        gst_rate: taxPercent,
        igst,
        total: +(amount + igst).toFixed(2),
      };
    });
 
    const amountTotal = items.reduce((sum, it) => sum + it.amount, 0);
    const igstTotal = items.reduce((sum, it) => sum + it.igst, 0);
    const shipping = Number(order.shipping_charges || 0);
    const grandTotal = +(amountTotal + igstTotal + shipping).toFixed(2);

    const invoice = {
      doc_type: 'invoice',
      title: 'GST Invoice',
      invoice_number: invoiceNumber,
      quotation_number: order.quotation_number || null, // traceability link
      date: invoiceDate,
      due_date: due.toISOString().slice(0, 10),
      company: companyBlock(s),
      customer: {
        name: order.customer?.company_name,
        contact: order.customer?.contact_person,
        address: order.customer?.address,
        gstin: order.customer?.gstin,
        pan: order.customer?.pan || null,
        email: order.customer?.email,
        phone: order.customer?.phone,
      },
      items,
      amount: +amountTotal.toFixed(2),
      tax_percent: taxPercent,
      igst: +igstTotal.toFixed(2),
      shipping_charges: shipping,
      total: grandTotal,
      bank: {
        account_name: s.bank_account_name || '',
        account_number: s.bank_account_number || '',
        ifsc: s.bank_ifsc || '',
        account_type: s.bank_account_type || '',
        bank_name: s.bank_name || '',
      },
      terms: (s.invoice_terms || '').split(/[|\n]/).map((t) => t.trim()).filter(Boolean),
      status: order.status,
    };
    res.json({ success: true, data: invoice });
  } catch (err) { next(err); }
};
 
// Quotation JSON — same structure, no tax columns / bank details (per sample).
exports.generateQuotation = async (req, res, next) => {
  try {
    const { data: order, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', req.params.id).single();
    if (error || !order) return next(new AppError('Order not found.', 404));
 
    const s = await getSettings([
      'company_name', 'company_address', 'company_gstin', 'company_pan', 'company_email', 'company_phone',
      'quotation_terms',
    ]);
 
    // Assign a stable, unique quotation number the first time (persisted)
    let quotationNumber = order.quotation_number;
    let quotationDate = order.quotation_date || order.order_date;
    if (!quotationNumber) {
      const seq = await nextSequence('quotation_number');
      quotationNumber = `K/${financialYear(quotationDate)}/K${seq}`;
      const { error: uErr } = await supabase.from('orders').update({ quotation_number: quotationNumber, quotation_date: quotationDate }).eq('id', order.id);
      if (uErr) return next(new AppError(uErr.message, 500));
      await auditLog({ user: req.user, action: 'QUOTATION', entity_type: 'order', entity_id: order.id, new_values: { quotation_number: quotationNumber }, ip_address: req.ip });
    }
 
    const items = (order.items || []).map((it) => {
      const rate = it.final_price != null ? Number(it.final_price) : Number(it.unit_price);
      return {
        product: lineName(it),
        quantity: Number(it.quantity),
        unit: it.unit,
        rate,
        amount: +(Number(it.quantity) * rate).toFixed(2),
      };
    });
    const total = items.reduce((sum, it) => sum + it.amount, 0);
 
    const quotation = {
      doc_type: 'quotation',
      title: 'Quotation',
      quotation_number: quotationNumber,
      date: quotationDate,
      company: companyBlock(s),
      customer: {
        name: order.customer?.company_name,
        contact: order.customer?.contact_person,
        address: order.customer?.address,
        gstin: order.customer?.gstin,
        email: order.customer?.email,
        phone: order.customer?.phone,
      },
      items,
      total: +total.toFixed(2),
      terms: (s.quotation_terms || '').split(/[|\n]/).map((t) => t.trim()).filter(Boolean),
    };
    res.json({ success: true, data: quotation });
  } catch (err) { next(err); }
};