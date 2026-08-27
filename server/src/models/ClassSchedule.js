module.exports = (sequelize, DataTypes) => {
  const ClassSchedule = sequelize.define(
    'ClassSchedule',
    {
      schedule_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      equipment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      lab_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      session_day: {
        type: DataTypes.ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'),
        allowNull: false,
      },
      start_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      duration_hours: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        validate: {
          min: 0.1,
        },
      },
    },
    {
      tableName: 'class_schedule',
      timestamps: false,
    }
  );

  ClassSchedule.associate = (models) => {
    ClassSchedule.belongsTo(models.Equipment, {
      foreignKey: 'equipment_id',
      as: 'equipment',
      onDelete: 'CASCADE',
    });
  };

  return ClassSchedule;
};
