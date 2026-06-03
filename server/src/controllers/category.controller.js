const { Category } = require('../models');
const { createCategorySchema, updateCategorySchema } = require('../validations/category.validation');
const AppError = require('../utils/AppError');
const slugify = require('slugify');

// ── PUBLIC ────────────────────────────────────────────────────────

exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      include: {
        model: Category,
        as: 'children',
        attributes: ['id', 'name', 'slug'],
      },
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      where: { slug: req.params.slug },
      include: [
        {
          model: Category,
          as: 'children',
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });
    if (!category) return next(new AppError('Category not found.', 404));
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// ── ADMIN ────────────────────────────────────────────────────────

exports.createCategory = async (req, res, next) => {
  try {
    const { error, value } = createCategorySchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const slug = slugify(value.name, { lower: true, strict: true });
    const existing = await Category.findOne({ where: { slug } });
    if (existing) {
      return next(new AppError('A category with this name already exists.', 400));
    }

    const category = await Category.create({ ...value, slug });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return next(new AppError('Category not found.', 404));

    const { error, value } = updateCategorySchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    if (value.name && value.name !== category.name) {
      value.slug = slugify(value.name, { lower: true, strict: true });
    }

    await category.update(value);
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return next(new AppError('Category not found.', 404));

    // Check if any products use this category; cascade only if safe? we rely on DB constraint
    await category.destroy();
    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
};