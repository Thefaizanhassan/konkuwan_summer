const { Op, Sequelize } = require('sequelize');
const {
  Order,
  OrderItem,
  Product,
  Customer,
  PricingHistory,
  User,
  Inventory,
} = require('../models');
const AppError = require('../utils/AppError');

// ── Helper: date range from query ──
const getDateRange = (query) => {
  const { from, to } = query;
  const where = {};
  if (from && to) {
    where.order_date = { [Op.between]: [from, to] };
  } else if (from) {
    where.order_date = { [Op.gte]: from };
  } else if (to) {
    where.order_date = { [Op.lte]: to };
  }
  return where;
};

// ── Helper: group by period (day, month, year) ──
const getGroupBy = (period = 'month') => {
  return Sequelize.fn('date_trunc', period, Sequelize.col('order_date'));
};

// ─────────────────────────────────────────────────────────────────
// Dashboard (MTD summary + recent orders + chart)
// ─────────────────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // MTD revenue (delivered orders)
    const revenueMTD = await Order.sum('total_amount', {
      where: {
        status: 'delivered',
        order_date: { [Op.between]: [startOfMonth, endOfMonth] },
      },
    }) || 0;

    // MTD order count (all non-cancelled)
    const ordersMTD = await Order.count({
      where: {
        status: { [Op.ne]: 'cancelled' },
        order_date: { [Op.between]: [startOfMonth, endOfMonth] },
      },
    });

    // Total customers
    const totalCustomers = await Customer.count();

    // Recent 5 orders
    const recentOrders = await Order.findAll({
      include: [
        { model: Customer, attributes: ['id', 'company_name'] },
        { model: User, as: 'createdByUser', attributes: ['id', 'name'], foreignKey: 'created_by' },
      ],
      order: [['created_at', 'DESC']],
      limit: 5,
    });

    // Top 5 selling products by quantity (this month)
    const topProducts = await OrderItem.findAll({
      attributes: [
        'product_id',
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'total_quantity'],
        [Sequelize.fn('SUM', Sequelize.col('line_total')), 'total_revenue'],
      ],
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'slug'],
        },
      ],
      where: {
        // Filter by orders this month? We'll do a subquery or join with orders.
        // Simpler: join Order with status delivered and date range.
        // We'll use include with required true and where on Order.
      },
      group: ['OrderItem.product_id', 'Product.id'],
      order: [[Sequelize.fn('SUM', Sequelize.col('quantity')), 'DESC']],
      limit: 5,
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'slug'],
        },
      ],
      // Need to join with Order to filter by date/status
      // Use separate query to get product IDs first or raw SQL.
      // Let's use a raw approach with sequelize.literal in where; but simpler: we'll query orders and then aggregate in JS? Not efficient.
      // Better: use include with through Order model.
      // Since OrderItem belongs to Order, we can include Order and apply where.
      include: [
        {
          model: Order,
          attributes: [],
          where: {
            status: 'delivered',
            order_date: { [Op.between]: [startOfMonth, endOfMonth] },
          },
        },
        {
          model: Product,
          attributes: ['id', 'name', 'slug'],
        },
      ],
      // Now group by product_id and Product.id
      group: ['OrderItem.product_id', 'Product.id'],
      order: [[Sequelize.fn('SUM', Sequelize.col('OrderItem.quantity')), 'DESC']],
      limit: 5,
      subQuery: false, // to avoid grouping issues
    });

    // Chart data: revenue last 12 months
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const revenueChart = await Order.findAll({
      attributes: [
        [getGroupBy('month'), 'month'],
        [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'revenue'],
      ],
      where: {
        status: 'delivered',
        order_date: { [Op.gte]: twelveMonthsAgo },
      },
      group: ['month'],
      order: [['month', 'ASC']],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        kpi: {
          revenue_mtd: revenueMTD,
          orders_mtd: ordersMTD,
          total_customers: totalCustomers,
        },
        recent_orders: recentOrders,
        top_products: topProducts,
        revenue_chart: revenueChart,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// Revenue Report
// ─────────────────────────────────────────────────────────────────
exports.getRevenueReport = async (req, res, next) => {
  try {
    const { period = 'month', from, to, status = 'delivered' } = req.query;
    const dateWhere = getDateRange({ from, to });
    const baseWhere = {
      ...dateWhere,
      status: status,
    };

    // Time series
    const revenueSeries = await Order.findAll({
      attributes: [
        [getGroupBy(period), 'period'],
        [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'revenue'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'order_count'],
      ],
      where: baseWhere,
      group: ['period'],
      order: [['period', 'ASC']],
      raw: true,
    });

    // Total
    const totalRevenue = await Order.sum('total_amount', { where: baseWhere });
    const totalOrders = await Order.count({ where: baseWhere });

    res.json({
      success: true,
      data: {
        series: revenueSeries,
        summary: {
          total_revenue: totalRevenue || 0,
          total_orders: totalOrders,
          average_order_value: totalOrders > 0 ? (totalRevenue / totalOrders) : 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// Sales Report (detailed breakdown)
// ─────────────────────────────────────────────────────────────────
exports.getSalesReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateWhere = getDateRange({ from, to });

    // Total sales summary
    const totalOrders = await Order.count({ where: { ...dateWhere, status: { [Op.ne]: 'cancelled' } } });
    const totalRevenue = await Order.sum('total_amount', {
      where: { ...dateWhere, status: 'delivered' },
    });

    // Status distribution
    const statusDistribution = await Order.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      where: dateWhere,
      group: ['status'],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        total_orders: totalOrders,
        total_revenue: totalRevenue || 0,
        average_order_value: totalOrders ? (totalRevenue / totalOrders) : 0,
        status_distribution: statusDistribution,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// Product Performance
// ─────────────────────────────────────────────────────────────────
exports.getProductPerformance = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const results = await OrderItem.findAndCountAll({
      attributes: [
        'product_id',
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'total_quantity_sold'],
        [Sequelize.fn('SUM', Sequelize.col('line_total')), 'total_revenue'],
        [Sequelize.fn('AVG', Sequelize.col('unit_price')), 'avg_selling_price'],
        [Sequelize.fn('MAX', Sequelize.col('Order.order_date')), 'last_sale_date'],
        [Sequelize.fn('COUNT', Sequelize.col('OrderItem.id')), 'times_ordered'],
      ],
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'slug', 'is_active'],
        },
        {
          model: Order,
          attributes: [],
          where: { status: { [Op.ne]: 'cancelled' } },
        },
      ],
      group: ['OrderItem.product_id', 'Product.id'],
      order: [[Sequelize.fn('SUM', Sequelize.col('quantity')), 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      subQuery: false,
      distinct: true,
    });

    res.json({
      success: true,
      data: results.rows,
      pagination: {
        total: results.count.length,
        page: parseInt(page),
        pages: Math.ceil(results.count.length / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// Customer Insights
// ─────────────────────────────────────────────────────────────────
exports.getCustomerInsights = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const customers = await Customer.findAndCountAll({
      attributes: {
        include: [
          [Sequelize.fn('COUNT', Sequelize.col('Orders.id')), 'order_count'],
          [Sequelize.fn('SUM', Sequelize.col('Orders.total_amount')), 'total_spent'],
          [Sequelize.fn('MAX', Sequelize.col('Orders.order_date')), 'last_order_date'],
          [Sequelize.fn('AVG', Sequelize.col('Orders.total_amount')), 'average_order_value'],
        ],
      },
      include: [
        {
          model: Order,
          attributes: [],
          where: { status: { [Op.ne]: 'cancelled' } },
          required: false, // left join to include customers with 0 orders
        },
      ],
      group: ['Customer.id'],
      order: [[Sequelize.fn('SUM', Sequelize.col('Orders.total_amount')), 'DESC NULLS LAST']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      subQuery: false,
      distinct: true,
    });

    res.json({
      success: true,
      data: customers.rows,
      pagination: {
        total: customers.count.length,
        page: parseInt(page),
        pages: Math.ceil(customers.count.length / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// Inventory Report
// ─────────────────────────────────────────────────────────────────
exports.getInventoryReport = async (req, res, next) => {
  try {
    // Simple inventory summary by product (aggregated lot quantities)
    const inventory = await Inventory.findAll({
      attributes: [
        'product_id',
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'total_stock'],
        [Sequelize.fn('MAX', Sequelize.col('updated_at')), 'last_updated'],
      ],
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'unit'],
        },
      ],
      group: ['Inventory.product_id', 'Product.id'],
      order: [[Sequelize.fn('SUM', Sequelize.col('quantity')), 'DESC']],
      raw: true,
    });

    res.json({
      success: true,
      data: inventory,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// Order Trends (monthly counts, average delivery time, etc.)
// ─────────────────────────────────────────────────────────────────
exports.getOrderTrends = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;

    const orderCounts = await Order.findAll({
      attributes: [
        [getGroupBy(period), 'period'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      where: {
        status: { [Op.ne]: 'cancelled' },
      },
      group: ['period'],
      order: [['period', 'ASC']],
      raw: true,
    });

    // Average delivery time (for delivered orders) – days between order_date and updated_at
    // We'll approximate by using a query that calculates avg( updated_at - order_date )
    const avgDeliveryTime = await Order.findOne({
      attributes: [
        [Sequelize.fn('AVG', Sequelize.literal("updated_at - order_date")), 'avg_days'],
      ],
      where: { status: 'delivered' },
      raw: true,
    });

    res.json({
      success: true,
      data: {
        order_counts: orderCounts,
        avg_delivery_days: avgDeliveryTime?.avg_days || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// Pricing History
// ─────────────────────────────────────────────────────────────────
exports.getPricingHistory = async (req, res, next) => {
  try {
    const { product_id, page = 1, limit = 30 } = req.query;
    const where = {};
    if (product_id) where.product_id = product_id;

    const offset = (page - 1) * limit;

    const { count, rows } = await PricingHistory.findAndCountAll({
      where,
      include: [
        { model: Product, attributes: ['id', 'name', 'slug'] },
        { model: User, attributes: ['id', 'name'], foreignKey: 'changed_by' },
      ],
      order: [['effective_date', 'DESC'], ['created_at', 'DESC']],
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