const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');

const sequelize = new Sequelize(dbConfig);

// Import models
const User = require('./User')(sequelize);
const Role = require('./Role')(sequelize);
const UserRole = require('./UserRole')(sequelize);
const Product = require('./Product')(sequelize);
const Category = require('./Category')(sequelize);
const ProductImage = require('./ProductImage')(sequelize);
const ProductCategory = require('./ProductCategory')(sequelize);
const Customer = require('./Customer')(sequelize);
const Order = require('./Order')(sequelize);
const OrderItem = require('./OrderItem')(sequelize);
const PricingHistory = require('./PricingHistory')(sequelize);
const Inventory = require('./Inventory')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);
const Settings = require('./Settings')(sequelize);

// Associations
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id' });

Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

Product.belongsToMany(Category, { through: ProductCategory, foreignKey: 'product_id' });
Category.belongsToMany(Product, { through: ProductCategory, foreignKey: 'category_id' });

// Self-referencing for categories
Category.hasMany(Category, { as: 'children', foreignKey: 'parent_id' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parent_id' });

AuditLog.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(AuditLog, { foreignKey: 'user_id' });

// maybe Inventory has not been imported above
Inventory.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(Inventory, { foreignKey: 'product_id' });

// Customer <-> Order
Customer.hasMany(Order, { foreignKey: 'customer_id' });
Order.belongsTo(Customer, { foreignKey: 'customer_id' });

// Order <-> OrderItem
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

// Product <-> OrderItem (already indirectly via Product model, but make explicit)
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(OrderItem, { foreignKey: 'product_id' });

// PricingHistory <-> Product
Product.hasMany(PricingHistory, { foreignKey: 'product_id' });
PricingHistory.belongsTo(Product, { foreignKey: 'product_id' });

// User associations for created_by/updated_by (if not already)
// User has many orders (created_by) etc. We'll leave them loose.

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  Product,
  Category,
  ProductImage,
  ProductCategory,
  Customer,
  Order,
  OrderItem,
  PricingHistory,
  Inventory,
  AuditLog,
  Settings,
};