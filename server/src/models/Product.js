const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(220),
      allowNull: false,
      unique: true,
    },
    botanical_name: {
      type: DataTypes.STRING(255),
    },
    description: {
      type: DataTypes.TEXT,
    },
    forms: {
      type: DataTypes.STRING(255),
    },
    price_min: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    price_max: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(50),
      defaultValue: 'kg',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    updated_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    tableName: 'products',
    underscored: true,
  });

  return Product;
};