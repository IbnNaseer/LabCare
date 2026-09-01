const { Op } = require('sequelize');
const { Prediction, Equipment, FaultReport, MaintenanceLog, User } = require('../models');
const { calculateEHI } = require('../services/ehiService');
const { sendHighRiskAlert } = require('../services/alertService');

exports.getByEquipment = async (req, res, next) => {
  try {
    const { equipmentId } = req.params;

    const predictions = await Prediction.findAll({
      where: { equipment_id: equipmentId },
      order: [['computed_at', 'DESC']],
      limit: 50,
    });

    return res.status(200).json({
      success: true,
      data: predictions,
    });
  } catch (err) {
    next(err);
  }
};

exports.getHighRisk = async (req, res, next) => {
  try {

    const allEquipment = await Equipment.findAll({
      where: { status: { [Op.ne]: 'Scrapped' } },
      include: [
        {
          model: Prediction,
          as: 'predictions',
          limit: 1,
          order: [['computed_at', 'DESC']],
        },
      ],
    });

    const highRiskAssets = allEquipment.filter((item) => {
      const latest = item.predictions && item.predictions[0];
      return latest && latest.risk_level === 'High';
    });

    return res.status(200).json({
      success: true,
      data: {
        count: highRiskAssets.length,
        equipment: highRiskAssets,
        footnote: 'Predictions are based on estimated operational hours and maintenance history, not sensor telemetry.',
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.recalculate = async (req, res, next) => {
  try {
    const allEquipment = await Equipment.findAll({
      where: { status: { [Op.ne]: 'Scrapped' } },
    });

    const staffUser = await User.findOne({
      where: { role: { [Op.in]: ['Technologist', 'Engineer', 'Admin'] } },
      order: [['user_id', 'ASC']],
    });
    const alertEmail = staffUser ? staffUser.email : 'alerts@labfaultsystem.local';

    const results = [];

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

      let alertSent = false;
      if (riskLevel === 'High') {
        alertSent = await sendHighRiskAlert(alertEmail, item, ehi);
      }

      const prediction = await Prediction.create({
        equipment_id: item.equipment_id,
        ehi_score: ehi,
        risk_level: riskLevel,
        computed_at: new Date(),
        alert_sent: alertSent,
      });

      results.push({
        equipment_id: item.equipment_id,
        name: item.name,
        serial_number: item.serial_number,
        ehi,
        riskLevel,
        alertSent,
      });
    }

    return res.status(200).json({
      success: true,
      message: `EHI recalculated successfully for ${results.length} equipment items`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const totalEquipment = await Equipment.count({ where: { status: { [Op.ne]: 'Scrapped' } } });
    const inMaintenance = await Equipment.count({ where: { status: 'Under Repair' } });
    const activeFaults = await FaultReport.count({
      where: { status: { [Op.in]: ['Pending', 'In-Progress'] } },
    });

    const allEquipment = await Equipment.findAll({
      where: { status: { [Op.ne]: 'Scrapped' } },
      include: [
        {
          model: Prediction,
          as: 'predictions',
          limit: 1,
          order: [['computed_at', 'DESC']],
        },
      ],
    });

    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    let totalScore = 0;
    let scoredCount = 0;

    for (const item of allEquipment) {
      let pred = item.predictions && item.predictions[0];
      if (!pred) {
        const failureCount = await FaultReport.count({
          where: { equipment_id: item.equipment_id, status: { [Op.in]: ['Resolved', 'Scrapped'] } },
        });
        const calc = calculateEHI({
          operationalHours: parseFloat(item.operational_hours || 0),
          expectedLifespanHours: item.expected_lifespan_hours || 10000,
          failureCount,
          daysSinceLastService: 0,
        });
        pred = { ehi_score: calc.ehi, risk_level: calc.riskLevel };
      }

      const score = parseFloat(pred.ehi_score);
      totalScore += score;
      scoredCount++;
      if (pred.risk_level === 'High') highRiskCount++;
      else if (pred.risk_level === 'Medium') mediumRiskCount++;
      else lowRiskCount++;
    }

    const averageHealth = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 100;

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendLabels = [];
    const pendingTrend = [];
    const inProgressTrend = [];
    const resolvedTrend = [];

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      trendLabels.push(daysOfWeek[d.getDay()]);

      const pendingCount = await FaultReport.count({
        where: {
          created_at: { [Op.between]: [startOfDay, endOfDay] },
          status: 'Pending',
        },
      });

      const inProgCount = await FaultReport.count({
        where: {
          created_at: { [Op.between]: [startOfDay, endOfDay] },
          status: 'In-Progress',
        },
      });

      const resolvedCount = await FaultReport.count({
        where: {
          [Op.or]: [
            { resolved_at: { [Op.between]: [startOfDay, endOfDay] } },
            { created_at: { [Op.between]: [startOfDay, endOfDay] }, status: 'Resolved' },
          ],
        },
      });

      pendingTrend.push(pendingCount);
      inProgressTrend.push(inProgCount);
      resolvedTrend.push(resolvedCount);
    }

    const recentFaults = await FaultReport.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [
        { model: Equipment, as: 'equipment', attributes: ['equipment_id', 'name', 'serial_number', 'location'] },
        { model: User, as: 'reporter', attributes: ['user_id', 'name', 'role'] },
      ],
    });

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalEquipment,
          activeFaults,
          inMaintenance,
          predictedAtRisk: highRiskCount,
          averageHealth,
        },
        healthDistribution: {
          highRisk: highRiskCount,
          mediumRisk: mediumRiskCount,
          lowRisk: lowRiskCount,
          total: scoredCount,
        },
        faultTrend: {
          labels: trendLabels,
          pending: pendingTrend,
          inProgress: inProgressTrend,
          resolved: resolvedTrend,
        },
        recentFaults,
        note: 'Operational hours and EHI scores are estimated and rule-based.',
      },
    });
  } catch (err) {
    next(err);
  }
};
