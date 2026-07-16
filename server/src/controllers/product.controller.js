const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/audit');
const { createProductSchema, updateProductSchema } = require('../validations/product.validation');

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
async function uniqueSlug(base) {
  let slug = slugify(base), n = 1;
  while (true) {
    const { data } = await supabase.from('products').select('id').eq('slug', slug).limit(1);
    if (!data || data.length === 0) return slug;
    slug = `${slugify(base)}-${++n}`;
  }
}

exports.getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const from = (page - 1) * limit;
 
    let q = supabase
      .from('products')
      .select('*, images:product_images(*), categories:product_category(category:categories(*))', { count: 'exact' });
    // The public page lists ALL products; is_active only controls the green
    // "Available" badge. Pass active_only=true to restrict to available ones.
    if (req.query.active_only === 'true') q = q.eq('is_active', true);
    // Admin drag-and-drop order first, newest as tiebreaker
    q = q.order('sort_order', { ascending: true }).order('created_at', { ascending: false }).range(from, from + limit - 1);
 
    const { data, count, error } = await q;
    if (error) return next(new AppError(error.message, 500));

    const withPrimary = (data || []).map(p => ({
      ...p,
      primary_image: (p.images || []).find(i => i.is_primary) || (p.images || [])[0] || null,
    }));
    res.json({ success: true, data: withPrimary, pagination: { total: count, page, pages: Math.ceil((count || 0) / limit) } });
  } catch (err) { next(err); }
};

exports.getProductBySlug = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, images:product_images(*), categories:product_category(category:categories(*))')
      .eq('slug', req.params.slug).single();
    if (error || !data) return next(new AppError('Product not found.', 404));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { error: vErr, value } = createProductSchema.validate(req.body);
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
    const { category_ids, ...fields } = value;
    fields.slug = await uniqueSlug(fields.name);

    // New products go to the end of the display order
    const { data: last } = await supabase.from('products').select('sort_order').order('sort_order', { ascending: false }).limit(1);
    fields.sort_order = last && last.length ? (last[0].sort_order || 0) + 1 : 1;

    const { data: product, error } = await supabase.from('products').insert(fields).select().single();
    if (error) return next(new AppError(error.message, 500));

    if (Array.isArray(category_ids) && category_ids.length) {
      await supabase.from('product_category').insert(category_ids.map(cid => ({ product_id: product.id, category_id: cid })));
    }
    await auditLog({ user: req.user, action: 'CREATE', entity_type: 'product', entity_id: product.id, new_values: product, ip_address: req.ip });
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { error: vErr, value } = updateProductSchema.validate(req.body);
    if (vErr) return next(new AppError(vErr.details[0].message, 400));
    const { category_ids, ...fields } = value;
    fields.updated_at = new Date().toISOString();

    const { data: old } = await supabase.from('products').select('*').eq('id', req.params.id).single();
 
    const { data, error } = await supabase.from('products').update(fields).eq('id', req.params.id).select().single();
    if (error) return next(new AppError(error.message, 500));
    if (!data) return next(new AppError('Product not found.', 404));

    if (Array.isArray(category_ids)) {
      await supabase.from('product_category').delete().eq('product_id', req.params.id);
      if (category_ids.length)
        await supabase.from('product_category').insert(category_ids.map(cid => ({ product_id: req.params.id, category_id: cid })));
    }
    // Restoring an archived product (is_active false -> true) is an UNARCHIVE
    const action = old && old.is_active === false && data.is_active === true ? 'UNARCHIVE' : 'UPDATE';
    await auditLog({ user: req.user, action, entity_type: 'product', entity_id: data.id, old_values: old, new_values: data, ip_address: req.ip });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// PUT /admin/products/reorder — body: { ids: [...], start: 0 }
// Assigns sort_order = start + index for the given page of product ids.
exports.reorderProducts = async (req, res, next) => {
  try {
    const { ids, start } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return next(new AppError('Request body must contain a non-empty "ids" array.', 400));
    }
    const offset = Number.isInteger(start) && start >= 0 ? start : 0;
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase.from('products').update({ sort_order: offset + i + 1 }).eq('id', ids[i]);
      if (error) return next(new AppError(error.message, 500));
    }
    await auditLog({ user: req.user, action: 'UPDATE', entity_type: 'product', new_values: { reordered: ids.length, start: offset }, ip_address: req.ip });
    res.json({ success: true, message: 'Order saved.' });
  } catch (err) { next(err); }
};
 
// DELETE /admin/products/:id/permanent — hard delete (images cascade;
// blocked by the DB if the product appears in any order)
exports.deleteProductPermanent = async (req, res, next) => {
  try {
    const { data: old } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (!old) return next(new AppError('Product not found.', 404));
 
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) {
      if (error.code === '23503') {
        return next(new AppError('Cannot delete: this product is used in one or more orders. Archive it instead to keep order history intact.', 409));
      }
      return next(new AppError(error.message, 500));
    }
    await auditLog({ user: req.user, action: 'DELETE', entity_type: 'product', entity_id: req.params.id, old_values: old, ip_address: req.ip });
    res.json({ success: true, message: 'Product permanently deleted.' });
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    // Soft archive (keeps order history intact)
    const { data, error } = await supabase.from('products').update({ is_active: false }).eq('id', req.params.id).select().single();
    if (error) return next(new AppError(error.message, 500));
    if (!data) return next(new AppError('Product not found.', 404));
    await auditLog({ user: req.user, action: 'DEACTIVATE', entity_type: 'product', entity_id: data.id, new_values: { is_active: false, name: data.name }, ip_address: req.ip });
    res.json({ success: true, message: 'Product archived.' });
  } catch (err) { next(err); }
};

exports.uploadProductImages = async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || !files.length) return next(new AppError('No images uploaded.', 400));
    const { data: last } = await supabase.from('product_images').select('sort_order').eq('product_id', req.params.id).order('sort_order', { ascending: false }).limit(1);
    let next0 = last && last.length ? last[0].sort_order + 1 : 0;
    const { count } = await supabase.from('product_images').select('id', { count: 'exact', head: true }).eq('product_id', req.params.id);
    const rows = files.map((f, i) => ({ product_id: req.params.id, url: `/uploads/products/${f.filename}`, alt_text: f.originalname, is_primary: (count || 0) === 0 && i === 0, sort_order: next0 + i }));
    const { data, error } = await supabase.from('product_images').insert(rows).select();
    if (error) return next(new AppError(error.message, 500));
    await auditLog({ user: req.user, action: 'UPDATE', entity_type: 'product', entity_id: req.params.id, new_values: { images_added: rows.length }, ip_address: req.ip });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.linkProductImage = async (req, res, next) => {
  try {
    const { url, alt_text } = req.body;
    if (!url || url.length > 500) return next(new AppError('A valid "url" (max 500 chars) is required.', 400));
    const { count } = await supabase.from('product_images').select('id', { count: 'exact', head: true }).eq('product_id', req.params.id);
    const { data, error } = await supabase.from('product_images')
      .insert({ product_id: req.params.id, url, alt_text: alt_text || null, is_primary: (count || 0) === 0 })
      .select().single();
    if (error) return next(new AppError(error.message, 500));
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.setPrimaryImage = async (req, res, next) => {
  try {
    await supabase.from('product_images').update({ is_primary: false }).eq('product_id', req.params.id);
    const { data, error } = await supabase.from('product_images').update({ is_primary: true }).eq('id', req.params.imageId).select().single();
    if (error) return next(new AppError(error.message, 500));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteProductImage = async (req, res, next) => {
  try {
    const { error } = await supabase.from('product_images').delete().eq('id', req.params.imageId).eq('product_id', req.params.id);
    if (error) return next(new AppError(error.message, 500));
    res.json({ success: true, message: 'Image deleted.' });
  } catch (err) { next(err); }
};