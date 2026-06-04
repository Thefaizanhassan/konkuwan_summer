const { Op } = require('sequelize');
const { Product, Category, ProductImage, ProductCategory, PricingHistory, sequelize } = require('../models');
const { createProductSchema, updateProductSchema } = require('../validations/product.validation');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const slugify = require('slugify');
const auditLog = require('../utils/audit');

// Helper: generate unique slug
const generateSlug = async (name, excludeId = null) => {
  let slug = slugify(name, { lower: true, strict: true });
  // Check uniqueness
  const where = { slug };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await Product.findOne({ where });
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }
  return slug;
};

// ── PUBLIC ENDPOINTS ──────────────────────────────────────────────

/**
 * GET /api/products
 * List all active products with optional filters, search, pagination
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      sort = 'created_at',
      order = 'DESC',
    } = req.query;

    const where = { is_active: true };

    // Search by name or botanical name
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { botanical_name: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filter by category slug
    if (category) {
      const categoryRecord = await Category.findOne({ where: { slug: category } });
      if (!categoryRecord) {
        return next(new AppError('Category not found.', 404));
      }
      // Include products belonging to this category
      const productIds = await ProductCategory.findAll({
        where: { category_id: categoryRecord.id },
        attributes: ['product_id'],
      });
      where.id = productIds.map((p) => p.product_id);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          through: { attributes: [] },
          attributes: ['id', 'name', 'slug'],
        },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'url', 'alt_text', 'is_primary'],
          separate: true, // to order them
          order: [['sort_order', 'ASC']],
        },
      ],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    // Format response: first primary image as main image
    const products = rows.map((product) => {
      const productJSON = product.toJSON();
      const primaryImage = productJSON.images?.find((img) => img.is_primary) || productJSON.images?.[0];
      productJSON.primary_image = primaryImage || null;
      return productJSON;
    });

    res.json({
      success: true,
      data: products,
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

/**
 * GET /api/products/:slug
 * Get single product by slug with images and categories
 */
exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      where: { slug: req.params.slug, is_active: true },
      include: [
        {
          model: Category,
          through: { attributes: [] },
          attributes: ['id', 'name', 'slug'],
        },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'url', 'alt_text', 'is_primary', 'sort_order'],
          separate: true,
          order: [['sort_order', 'ASC']],
        },
      ],
    });

    if (!product) {
      return next(new AppError('Product not found.', 404));
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ── ADMIN ENDPOINTS ──────────────────────────────────────────────

/**
 * POST /api/admin/products
 * Create a new product
 */
exports.createProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { error, value } = createProductSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    // Generate slug
    const slug = await generateSlug(value.name);

    const product = await Product.create(
      {
        ...value,
        slug,
        created_by: req.user.id,
      },
      { transaction }
    );

    // Attach categories if provided
    if (value.category_ids && value.category_ids.length > 0) {
      await product.setCategories(value.category_ids, { transaction });
    }

    await transaction.commit();

    await auditLog({
        user: req.user,
        action: 'CREATE',
        entity_type: 'product',
        entity_id: product.id,
        new_values: { name: value.name, slug: product.slug, price_min: value.price_min, price_max: value.price_max },
    });

    // Fetch with associations
    const fullProduct = await Product.findByPk(product.id, {
      include: [
        { model: Category, through: { attributes: [] } },
        { model: ProductImage, as: 'images' },
      ],
    });

    res.status(201).json({ success: true, data: fullProduct });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * PUT /api/admin/products/:id
 * Update a product (by UUID)
 */
exports.updateProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return next(new AppError('Product not found.', 404));

    const { error, value } = updateProductSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    // If name changes, regenerate slug (keeping old if name unchanged)
    if (value.name && value.name !== product.name) {
      value.slug = await generateSlug(value.name, product.id);
    }

    value.updated_by = req.user.id;

    await product.update(value, { transaction });

    if (value.price_min !== undefined || value.price_max !== undefined) {
        await PricingHistory.create({
            product_id: product.id,
            price_min: value.price_min ?? product.price_min,
            price_max: value.price_max ?? product.price_max,
            effective_date: new Date(),
            changed_by: req.user.id,
            notes: 'Price range updated via product management',
        }, { transaction });
    }

    // Update categories
    if (value.category_ids) {
      await product.setCategories(value.category_ids, { transaction });
    }

    await transaction.commit();

    const updatedProduct = await Product.findByPk(product.id, {
      include: [
        { model: Category, through: { attributes: [] } },
        { model: ProductImage, as: 'images' },
      ],
    });

    res.json({ success: true, data: updatedProduct });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * DELETE /api/admin/products/:id
 * Soft delete (archive) a product
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return next(new AppError('Product not found.', 404));

    product.is_active = false;
    product.updated_by = req.user.id;
    await product.save();

    res.json({ success: true, message: 'Product archived.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/products/:id/images
 * Upload images for a product
 */
exports.uploadProductImages = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return next(new AppError('Product not found.', 404));

    const files = req.files;
    if (!files || files.length === 0) {
      return next(new AppError('No images uploaded.', 400));
    }

    // Get the highest sort order to append new images
    const lastImage = await ProductImage.findOne({
      where: { product_id: product.id },
      order: [['sort_order', 'DESC']],
    });
    let nextOrder = lastImage ? lastImage.sort_order + 1 : 0;

    const images = files.map((file, index) => ({
      product_id: product.id,
      url: `/uploads/products/${file.filename}`,
      alt_text: file.originalname,
      is_primary: false, // first uploaded may be set later
      sort_order: nextOrder + index,
    }));

    const createdImages = await ProductImage.bulkCreate(images);

    res.status(201).json({ success: true, data: createdImages });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/products/:id/images/:imageId/primary
 * Set an image as primary
 */
exports.setPrimaryImage = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return next(new AppError('Product not found.', 404));

    const image = await ProductImage.findOne({
      where: { id: req.params.imageId, product_id: product.id },
    });
    if (!image) return next(new AppError('Image not found.', 404));

    // Remove primary from all others
    await ProductImage.update(
      { is_primary: false },
      { where: { product_id: product.id } }
    );

    image.is_primary = true;
    await image.save();

    res.json({ success: true, data: image });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/products/:id/images/:imageId
 * Delete an image
 */
exports.deleteProductImage = async (req, res, next) => {
  try {
    const image = await ProductImage.findOne({
      where: { id: req.params.imageId, product_id: req.params.id },
    });
    if (!image) return next(new AppError('Image not found.', 404));

    // Optionally delete file from disk (using fs module)
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', '..', image.url);
    fs.unlink(filePath, (err) => {
      if (err) logger.warn('File deletion failed: ' + filePath);
    });

    await image.destroy();
    res.json({ success: true, message: 'Image deleted.' });
  } catch (err) {
    next(err);
  }
};