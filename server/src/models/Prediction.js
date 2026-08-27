module.exports = (sequelize, DataTypes) => {
  const Prediction = sequelize.define(
    'Prediction',
    {
      prediction_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      equipment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ehi_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        validate: {
          min: 0,
          max: 100,
        },
      },
      risk_level: {
        type: DataTypes.ENUM('Low', 'Medium', 'High'),
        allowNull: false,
      },
      computed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      alert_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: 'predictions',
      timestamps: false,
    }
  );

  Prediction.associate = (models) => {
    Prediction.belongsTo(models.Equipment, {
      foreignKey: 'equipment_id',
      as: 'equipment',
      onDelete: 'CASCADE',
    });
  };

  return Prediction;
};
