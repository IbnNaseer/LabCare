const { Op } = require('sequelize');

const FAILURE_CAP = 10;
const SERVICE_INTERVAL_DAYS = 180;
const HIGH_RISK_THRESHOLD = 40;

function calculateEHI({
  operationalHours = 0,
  expectedLifespanHours = 1000,
  failureCount = 0,
  daysSinceLastService = 0,
}) {
  const safeLifespan = expectedLifespanHours > 0 ? expectedLifespanHours : 1;
  const safeOperational = Math.max(0, operationalHours);
  const safeFailures = Math.max(0, failureCount);
  const safeDaysSinceService = Math.max(0, daysSinceLastService);

  const usageTerm = Math.min(40, (safeOperational / safeLifespan) * 40);
  const failureTerm = Math.min(30, (safeFailures / FAILURE_CAP) * 30);
  const serviceTerm = Math.min(30, (safeDaysSinceService / SERVICE_INTERVAL_DAYS) * 30);

  let ehi = 100 - (usageTerm + failureTerm + serviceTerm);
  ehi = Math.max(0, Math.min(100, ehi));

  const riskLevel = ehi < HIGH_RISK_THRESHOLD ? 'High' : ehi < 70 ? 'Medium' : 'Low';

  return {
    ehi: Math.round(ehi * 100) / 100,
    riskLevel,
  };
}

async function recalculateSingleEquipment(equipmentId) {
  try {
    const { Equipment, FaultReport, MaintenanceLog, Prediction } = require('../models');

    const item = await Equipment.findByPk(equipmentId);
    if (!item) return null;

    const failureCount = await FaultReport.count({
      where: {
        equipment_id: equipmentId,
        status: { [Op.in]: ['Resolved', 'Scrapped'] },
      },
    });

    const lastMaintenance = await MaintenanceLog.findOne({
      where: { equipment_id: equipmentId },
      order: [['service_date', 'DESC']],
    });

    let daysSinceLastService = 0;
    if (lastMaintenance && lastMaintenance.service_date) {
      const diffMs = Date.now() - new Date(lastMaintenance.service_date).getTime();
      daysSinceLastService = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    } else if (item.purchase_date) {
      const diffMs = Date.now() - new Date(item.purchase_date).getTime();
      daysSinceLastService = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const { ehi, riskLevel } = calculateEHI({
      operationalHours: parseFloat(item.operational_hours || 0),
      expectedLifespanHours: item.expected_lifespan_hours || 10000,
      failureCount,
      daysSinceLastService,
    });

    const prediction = await Prediction.create({
      equipment_id: item.equipment_id,
      ehi_score: ehi,
      risk_level: riskLevel,
      computed_at: new Date(),
      alert_sent: false,
    });

    return { ehi, riskLevel, prediction };
  } catch (err) {
    console.error(`Error recalculating EHI for equipment #${equipmentId}:`, err);
    return null;
  }
}

module.exports = {
  calculateEHI,
  recalculateSingleEquipment,
  FAILURE_CAP,
  SERVICE_INTERVAL_DAYS,
  HIGH_RISK_THRESHOLD,
};
