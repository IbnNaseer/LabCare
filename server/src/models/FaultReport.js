module.exports = (sequelize, DataTypes) => {
  const FaultReport = sequelize.define(
    'FaultReport',
    {
      report_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      equipment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reported_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      priority: {
        type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
        allowNull: false,
        defaultValue: 'Medium',
      },
      image_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('Pending', 'In-Progress', 'Resolved', 'Scrapped'),
        allowNull: false,
        defaultValue: 'Pending',
      },
      resolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'fault_reports',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  FaultReport.associate = (models) => {
    FaultReport.belongsTo(models.Equipment, {
      foreignKey: 'equipment_id',
      as: 'equipment',
      onDelete: 'RESTRICT',
    });
    FaultReport.belongsTo(models.User, {
      foreignKey: 'reported_by',
      as: 'reporter',
      onDelete: 'RESTRICT',
    });
    FaultReport.hasMany(models.MaintenanceLog, {
      foreignKey: 'fault_report_id',
      as: 'maintenanceLogs',
      onDelete: 'SET NULL',
    });
  };

  return FaultReport;
};
