const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
    },
    order_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'confirmed', 'dispatched', 'delivered', 'cancelled']],
      },
    },
    total_amount: {
      type: DataTypes.DECIMAL(14, 2),
    },
    final_note: {
      type: DataTypes.TEXT,
    },
    created_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
    },
    updated_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
    },
  }, {
    tableName: 'orders',
    underscored: true,
  });

  return Order;
};