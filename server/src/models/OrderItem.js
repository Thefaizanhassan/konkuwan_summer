const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' },
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'kg',
    },
    unit_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    final_price: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    // line_total is computed as quantity * unit_price; can be stored or computed
    line_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true, // we'll compute in code for flexibility
    },
  }, {
    tableName: 'order_items',
    underscored: true,
    // We'll compute line_total before save if final_price not set
    hooks: {
      beforeSave: (item) => {
        if (item.quantity && item.unit_price) {
          item.line_total = parseFloat(item.quantity) * parseFloat(item.unit_price);
        }
      },
    },
  });

  return OrderItem;
};