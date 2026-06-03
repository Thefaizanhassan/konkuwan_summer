const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Settings = sequelize.define('Settings', {
    key: {
      type: DataTypes.STRING(100),
      primaryKey: true,
    },
    value: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'settings',
    underscored: true,
    updatedAt: 'updated_at',
    createdAt: false,
  });

  return Settings;
};