const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('UserRole', {
    user_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    role_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'roles',
        key: 'id',
      },
    },
  }, {
    tableName: 'user_roles',
    timestamps: false,
  });
};