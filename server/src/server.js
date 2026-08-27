const app = require('./app');
const { sequelize, Equipment, ClassSchedule, FaultReport, MaintenanceLog, Prediction } = require('./models');
const env = require('./config/env');
const cron = require('node-cron');
const { calculateEHI } = require('./services/ehiService');
const { Op } = require('sequelize');

const PORT = env.port || 3000;

// Setup nightly background estimation and recalculation (Runs daily at midnight: 00:00)
cron.schedule('0 0 * * *', async () => {
  console.log('[Cron Job] Starting nightly scheduled operational-hours accrual & EHI recalculation...');
  try {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const yesterdayDay = dayNames[(new Date().getDay() + 6) % 7];

    // Find class schedules that took place
    const activeSchedules = await ClassSchedule.findAll({
      where: { session_day: yesterdayDay },
    });

    for (const item of activeSchedules) {
      const equipment = await Equipment.findByPk(item.equipment_id);
      if (equipment && equipment.status !== 'Scrapped') {
        const addedHours = parseFloat(item.duration_hours) || 0;
        equipment.operational_hours = parseFloat(equipment.operational_hours) + addedHours;
        await equipment.save();
      }
    }

    // Recalculate EHI for all active equipment
    const allEquipment = await Equipment.findAll({ where: { status: { [Op.ne]: 'Scrapped' } } });
    for (const item of allEquipment) {
      const failureCount = await FaultReport.count({
        where: {
          equipment_id: item.equipment_id,
          status: { [Op.in]: ['Resolved', 'Scrapped'] },
        },
      });

      const lastMaintenance = await MaintenanceLog.findOne({
        where: { equipment_id: item.equipment_id },
        order: [['service_date', 'DESC']],
      });

      let daysSinceLastService = 0;
      if (lastMaintenance && lastMaintenance.service_date) {
        const diffMs = Date.now() - new Date(lastMaintenance.service_date).getTime();
        daysSinceLastService = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      } else if (item.purchase_date) {
        const diffMs = Date.now() - new Date(item.purchase_date).getTime();
        daysSinceLastService = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      const { ehi, riskLevel } = calculateEHI({
        operationalHours: parseFloat(item.operational_hours),
        expectedLifespanHours: item.expected_lifespan_hours,
        failureCount,
        daysSinceLastService,
      });

      await Prediction.create({
        equipment_id: item.equipment_id,
        ehi_score: ehi,
        risk_level: riskLevel,
        computed_at: new Date(),
      });
    }

    console.log('[Cron Job] Nightly accrual & EHI recalculation completed successfully.');
  } catch (err) {
    console.error('[Cron Job Error]', err);
  }
});

async function startServer() {
  try {
    console.log('[Database] Authenticating connection...');
    await sequelize.authenticate();
    console.log('[Database] MySQL connection established successfully via Sequelize.');

    // In development mode, auto-sync tables if they do not exist
    if (env.env === 'development') {
      await sequelize.sync({ alter: false });
      console.log('[Database] Sequelize models synchronized with database schema.');
    }

    app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`  LabCare API Server is running`);
      console.log(`  URL: http://localhost:${PORT}`);
      console.log(`  Health: http://localhost:${PORT}/api/v1/health`);
      console.log(`  Environment: ${env.env}`);
      console.log(`=========================================`);
    });
  } catch (err) {
    console.error('[Startup Error] Unable to connect to MySQL database:', err.message);
    console.log('Ensure MySQL is running and DB credentials in .env are configured.');
    
    // Start HTTP server anyway to allow health checks and informative errors
    app.listen(PORT, () => {
      console.log(`[Warning] Server started on port ${PORT} with DB disconnected.`);
    });
  }
}

startServer();
