const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Customer = sequelize.define('Customer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    company_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    contact_person: {
      type: DataTypes.STRING(120),
    },
    email: {
      type: DataTypes.STRING(255),
      validate: { isEmail: true },
    },
    phone: {
      type: DataTypes.STRING(20),
    },
    address: {
      type: DataTypes.TEXT,
    },
    gstin: {
      type: DataTypes.STRING(30),
    },
    notes: {
      type: DataTypes.TEXT,
    },
    lead_status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'active_customer',
      validate: { isIn: [['active_customer', 'potential_lead']] },
    },
    linkedin_url: {
      type: DataTypes.STRING(500),
    },
  }, {
    tableName: 'customers',
    underscored: true,
  });

  return Customer;
};