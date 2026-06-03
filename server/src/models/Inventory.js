const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Inventory = sequelize.define('Inventory', {
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
    lot_number: {
      type: DataTypes.STRING(100),
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
    harvest_date: {
      type: DataTypes.DATEONLY,
    },
    quality_grade: {
      type: DataTypes.STRING(20),
    },
    notes: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'inventory',
    underscored: true,
  });

  return Inventory;
};