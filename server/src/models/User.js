module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('Student', 'Technologist', 'Engineer', 'Admin'),
        allowNull: false,
        defaultValue: 'Student',
      },
    },
    {
      tableName: 'users',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  User.associate = (models) => {
    User.hasMany(models.FaultReport, {
      foreignKey: 'reported_by',
      as: 'faultReports',
      onDelete: 'RESTRICT',
    });
    User.hasMany(models.MaintenanceLog, {
      foreignKey: 'technician_id',
      as: 'maintenanceLogs',
      onDelete: 'RESTRICT',
    });
  };

  return User;
};
