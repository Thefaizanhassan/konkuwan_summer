const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PricingHistory = sequelize.define('PricingHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' },
    },
    price_min: {
      type: DataTypes.DECIMAL(12, 2),
    },
    price_max: {
      type: DataTypes.DECIMAL(12, 2),
    },
    effective_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    changed_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
    },
    notes: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'pricing_history',
    underscored: true,
  });

  return PricingHistory;
};