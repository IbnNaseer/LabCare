module.exports = (sequelize, DataTypes) => {
  const Equipment = sequelize.define(
    'Equipment',
    {
      equipment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      serial_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
      qr_code: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      },
      location: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      purchase_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      expected_lifespan_hours: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      operational_hours: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      status: {
        type: DataTypes.ENUM('Active', 'Under Repair', 'Scrapped'),
        allowNull: false,
        defaultValue: 'Active',
      },
    },
    {
      tableName: 'equipment',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  Equipment.associate = (models) => {
    Equipment.hasMany(models.FaultReport, {
      foreignKey: 'equipment_id',
      as: 'faultReports',
      onDelete: 'RESTRICT',
    });
    Equipment.hasMany(models.MaintenanceLog, {
      foreignKey: 'equipment_id',
      as: 'maintenanceLogs',
      onDelete: 'RESTRICT',
    });
    Equipment.hasMany(models.Prediction, {
      foreignKey: 'equipment_id',
      as: 'predictions',
      onDelete: 'CASCADE',
    });
    Equipment.hasMany(models.ClassSchedule, {
      foreignKey: 'equipment_id',
      as: 'classSchedules',
      onDelete: 'CASCADE',
    });
  };

  return Equipment;
};
