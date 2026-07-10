const supabase = require('../config/supabaseAdmin');
const { createCategorySchema, updateCategorySchema } = require('../validations/category.validation');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/audit');
 
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ── PUBLIC ────────────────────────────────────────────────────────

exports.getAllCategories = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*, children:categories!parent_id(id,name,slug)')
      .order('name', { ascending: true });
    if (error) return next(new AppError(error.message, 500));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*, children:categories!parent_id(id,name,slug)')
      .eq('slug', req.params.slug)
      .single();
    if (error || !data) return next(new AppError('Category not found.', 404));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── ADMIN ────────────────────────────────────────────────────────

exports.createCategory = async (req, res, next) => {
  try {
    const { error: vErr, value } = createCategorySchema.validate(req.body);
    if (vErr) return next(new AppError(vErr.details[0].message, 400));

    const slug = slugify(value.name);
    const { data: existing } = await supabase.from('categories').select('id').eq('slug', slug).limit(1);
    if (existing && existing.length) {
      return next(new AppError('A category with this name already exists.', 400));
    }

    const { data, error } = await supabase.from('categories').insert({ ...value, slug }).select().single();
    if (error) return next(new AppError(error.message, 500));
 
    await auditLog({ user: req.user, action: 'CREATE', entity_type: 'category', entity_id: data.id, new_values: data, ip_address: req.ip });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { error: vErr, value } = updateCategorySchema.validate(req.body);
    if (vErr) return next(new AppError(vErr.details[0].message, 400));

    const { data: old } = await supabase.from('categories').select('*').eq('id', req.params.id).single();
    if (!old) return next(new AppError('Category not found.', 404));

    if (value.name && value.name !== old.name) {
      value.slug = slugify(value.name);
    }
    value.updated_at = new Date().toISOString();
 
    const { data, error } = await supabase.from('categories').update(value).eq('id', req.params.id).select().single();
    if (error) return next(new AppError(error.message, 500));

    await auditLog({ user: req.user, action: 'UPDATE', entity_type: 'category', entity_id: data.id, old_values: old, new_values: data, ip_address: req.ip });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { data: old } = await supabase.from('categories').select('*').eq('id', req.params.id).single();
    if (!old) return next(new AppError('Category not found.', 404));

    const { error } = await supabase.from('categories').delete().eq('id', req.params.id);
    if (error) return next(new AppError(error.message, 500));
 
    await auditLog({ user: req.user, action: 'DELETE', entity_type: 'category', entity_id: req.params.id, old_values: old, ip_address: req.ip });
    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
};