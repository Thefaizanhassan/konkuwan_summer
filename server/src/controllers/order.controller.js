const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');
const {
  createOrderSchema,
  updateOrderSchema,
  setFinalPriceSchema,
} = require('../validations/order.validation');

const ORDER_SELECT =
  '*, customer:customers(*), items:order_items(*, product:products(id,name,slug,unit))';

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
      product_id: it.product_id,
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
    res.status(201).json({ success: true, data: full });
  } catch (err) { next(err); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { error: vErr, value } = updateOrderSchema.validate(req.body);
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
    const patch = { ...value, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('orders').update(patch).eq('id', req.params.id).select().single();
    if (error) return next(new AppError(error.message, 500));
    if (!data) return next(new AppError('Order not found.', 404));
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

    res.json({ success: true, data: item });
  } catch (err) { next(err); }
};

// Invoice JSON (consumed by the client PDF generator)
exports.generateInvoice = async (req, res, next) => {
  try {
    const { data: order, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', req.params.id).single();
    if (error || !order) return next(new AppError('Order not found.', 404));

    const due = new Date(order.order_date);
    due.setDate(due.getDate() + 30);

    const invoice = {
      invoice_number: `INV-${order.id.substring(0, 8).toUpperCase()}`,
      date: order.order_date,
      due_date: due.toISOString().slice(0, 10),
      customer: {
        name: order.customer?.company_name,
        contact: order.customer?.contact_person,
        address: order.customer?.address,
        gstin: order.customer?.gstin,
        email: order.customer?.email,
      },
      items: (order.items || []).map((it) => ({
        product: it.product?.name,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
        final_price: it.final_price,
        line_total: it.final_price != null ? Number(it.final_price) : Number(it.line_total),
      })),
      subtotal: order.total_amount,
      tax: 0, // set your GST treatment here when finalized
      total: order.total_amount,
      status: order.status,
    };
    res.json({ success: true, data: invoice });
  } catch (err) { next(err); }
};