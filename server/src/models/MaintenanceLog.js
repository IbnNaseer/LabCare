module.exports = (sequelize, DataTypes) => {
  const MaintenanceLog = sequelize.define(
    'MaintenanceLog',
    {
      log_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      equipment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      technician_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fault_report_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      action_taken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      parts_used: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      service_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
    },
    {
      tableName: 'maintenance_logs',
      timestamps: false,
    }
  );

  MaintenanceLog.associate = (models) => {
    MaintenanceLog.belongsTo(models.Equipment, {
      foreignKey: 'equipment_id',
      as: 'equipment',
      onDelete: 'RESTRICT',
    });
    MaintenanceLog.belongsTo(models.User, {
      foreignKey: 'technician_id',
      as: 'technician',
      onDelete: 'RESTRICT',
    });
    MaintenanceLog.belongsTo(models.FaultReport, {
      foreignKey: 'fault_report_id',
      as: 'faultReport',
      onDelete: 'SET NULL',
    });
  };

  return MaintenanceLog;
};
