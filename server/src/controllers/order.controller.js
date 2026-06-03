const { Op } = require('sequelize');
const {
  Order,
  OrderItem,
  Customer,
  Product,
  ProductImage,
  PricingHistory,
  User,
  sequelize,
} = require('../models');
const {
  createOrderSchema,
  updateOrderSchema,
  setFinalPriceSchema,
} = require('../validations/order.validation');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Admin: list orders with filtering, pagination
exports.getAllOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      customer_id,
      from_date,
      to_date,
      sort = 'order_date',
      order = 'DESC',
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (from_date && to_date) {
      where.order_date = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      where.order_date = { [Op.gte]: from_date };
    } else if (to_date) {
      where.order_date = { [Op.lte]: to_date };
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: Customer,
          attributes: ['id', 'company_name', 'contact_person'],
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              attributes: ['id', 'name', 'slug', 'unit'],
            },
          ],
        },
        {
          model: User,
          as: 'createdByUser', // we'll define an alias? We'll use `created_by` field, but sequelize can map via foreignKey
          attributes: ['id', 'name'],
          foreignKey: 'created_by',
        },
      ],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
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

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Customer },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product }],
        },
        {
          model: User,
          as: 'createdByUser',
          foreignKey: 'created_by',
          attributes: ['id', 'name'],
        },
      ],
    });
    if (!order) return next(new AppError('Order not found.', 404));
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

exports.createOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    // Check customer exists
    const customer = await Customer.findByPk(value.customer_id);
    if (!customer) return next(new AppError('Customer not found.', 404));

    const order = await Order.create(
      {
        customer_id: value.customer_id,
        order_date: value.order_date || new Date(),
        status: value.status || 'draft',
        final_note: value.final_note || null,
        created_by: req.user.id,
      },
      { transaction }
    );

    // Create order items
    const items = value.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit || 'kg',
      unit_price: item.unit_price,
    }));

    const createdItems = await OrderItem.bulkCreate(items, {
      transaction,
      individualHooks: true, // triggers beforeSave to compute line_total
    });

    // Calculate total_amount from line_total
    const total = createdItems.reduce((sum, item) => sum + parseFloat(item.line_total || 0), 0);
    await order.update({ total_amount: total }, { transaction });

    await transaction.commit();

    // Fetch full order with associations
    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: Customer },
        { model: OrderItem, as: 'items', include: [Product] },
      ],
    });
    res.status(201).json({ success: true, data: fullOrder });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return next(new AppError('Order not found.', 404));

    const { error, value } = updateOrderSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    // Validate status transition (optional but good)
    const allowedTransitions = {
      draft: ['confirmed', 'cancelled'],
      confirmed: ['dispatched', 'cancelled'],
      dispatched: ['delivered'],
      delivered: [],
      cancelled: [],
    };
    if (value.status) {
      const current = order.status;
      if (!allowedTransitions[current]?.includes(value.status)) {
        return next(new AppError(`Cannot change status from '${current}' to '${value.status}'.`, 400));
      }
    }

    if (value.final_note !== undefined) order.final_note = value.final_note;
    if (value.status) order.status = value.status;
    order.updated_by = req.user.id;
    await order.save();

    await auditLog({
        user: req.user,
        action: 'UPDATE',
        entity_type: 'order',
        entity_id: order.id,
        old_values: { status: previousStatus },
        new_values: { status: order.status },
    });

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

exports.setFinalPrice = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });
    if (!order) return next(new AppError('Order not found.', 404));

    const itemId = req.params.itemId;
    const item = await OrderItem.findOne({
      where: { id: itemId, order_id: order.id },
      transaction,
    });
    if (!item) return next(new AppError('Order item not found.', 404));

    const { error, value } = setFinalPriceSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    item.final_price = value.final_price;
    await item.save({ transaction });

    // Record pricing history for the product with order context
    const product = await Product.findByPk(item.product_id, { transaction });
    if (product) {
      await PricingHistory.create(
        {
          product_id: item.product_id,
          price_min: product.price_min,
          price_max: product.price_max,
          effective_date: order.order_date,
          changed_by: req.user.id,
          notes: `Negotiated final price for Order #${order.id.substring(0, 8)}: ₹${value.final_price} per ${item.unit}`,
        },
        { transaction }
      );
    }

    // Recalculate total_amount (sum of final_price or line_total)
    const items = await OrderItem.findAll({
      where: { order_id: order.id },
      transaction,
    });
    const newTotal = items.reduce((sum, i) => {
      const price = i.final_price != null ? parseFloat(i.final_price) : parseFloat(i.line_total || 0);
      return sum + price;
    }, 0);
    await order.update({ total_amount: newTotal, updated_by: req.user.id }, { transaction });

    await transaction.commit();

    // Return updated order
    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        { model: Customer },
        { model: OrderItem, as: 'items', include: [Product] },
      ],
    });
    res.json({ success: true, data: updatedOrder });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// Generate invoice data (JSON representation)
exports.generateInvoice = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Customer },
        { model: OrderItem, as: 'items', include: [Product] },
      ],
    });
    if (!order) return next(new AppError('Order not found.', 404));

    // Build invoice object
    const invoice = {
      invoice_number: `INV-${order.id.substring(0, 8).toUpperCase()}`,
      date: order.order_date,
      due_date: new Date(order.order_date).setDate(new Date(order.order_date).getDate() + 30), // 30-day due
      customer: {
        name: order.Customer.company_name,
        contact: order.Customer.contact_person,
        address: order.Customer.address,
        gstin: order.Customer.gstin,
        email: order.Customer.email,
      },
      items: order.items.map((item) => ({
        product: item.Product.name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        final_price: item.final_price,
        line_total: item.final_price != null ? parseFloat(item.final_price) : parseFloat(item.line_total),
      })),
      subtotal: order.total_amount,
      tax: 0, // placeholder for GST
      total: order.total_amount,
      status: order.status,
    };
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};