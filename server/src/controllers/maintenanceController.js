const { Op } = require('sequelize');
const { MaintenanceLog, Equipment, FaultReport, User } = require('../models');
const { recalculateSingleEquipment } = require('../services/ehiService');

exports.create = async (req, res, next) => {
  try {
    const {
      equipment_id,
      fault_report_id,
      action_taken,
      parts_used,
      service_date,
      cost = 0,
      resolve_fault = false,
    } = req.body;

    if (!equipment_id || !action_taken) {
      return res.status(400).json({
        success: false,
        error: 'Equipment ID and action taken description are required',
      });
    }

    const equipment = await Equipment.findByPk(equipment_id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found',
      });
    }

    const log = await MaintenanceLog.create({
      equipment_id: parseInt(equipment_id, 10),
      technician_id: req.user.user_id,
      fault_report_id: fault_report_id ? parseInt(fault_report_id, 10) : null,
      action_taken,
      parts_used: parts_used || null,
      service_date: service_date ? new Date(service_date) : new Date(),
      cost: parseFloat(cost) || 0,
    });

    if (fault_report_id && resolve_fault) {
      const fault = await FaultReport.findByPk(fault_report_id);
      if (fault && fault.status !== 'Resolved') {
        fault.status = 'Resolved';
        fault.resolved_at = new Date();
        await fault.save();
      }
    }

    const activeFaultsCount = await FaultReport.count({
      where: {
        equipment_id: parseInt(equipment_id, 10),
        status: { [Op.in]: ['Pending', 'In-Progress'] },
      },
    });

    if (activeFaultsCount === 0 && equipment.status === 'Under Repair') {
      equipment.status = 'Active';
      await equipment.save();
    }

    await recalculateSingleEquipment(parseInt(equipment_id, 10));

    const populatedLog = await MaintenanceLog.findByPk(log.log_id, {
      include: [
        { model: Equipment, as: 'equipment', attributes: ['equipment_id', 'name', 'serial_number'] },
        { model: User, as: 'technician', attributes: ['user_id', 'name', 'role'] },
        { model: FaultReport, as: 'faultReport' },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Maintenance log created successfully',
      data: populatedLog,
    });
  } catch (err) {
    next(err);
  }
};

exports.getByEquipment = async (req, res, next) => {
  try {
    const { equipmentId } = req.params;

    const logs = await MaintenanceLog.findAll({
      where: { equipment_id: equipmentId },
      order: [['service_date', 'DESC']],
      include: [
        { model: User, as: 'technician', attributes: ['user_id', 'name', 'email', 'role'] },
        { model: FaultReport, as: 'faultReport' },
      ],
    });

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows: logs } = await MaintenanceLog.findAndCountAll({
      limit: parseInt(limit, 10),
      offset,
      order: [['service_date', 'DESC']],
      include: [
        { model: Equipment, as: 'equipment', attributes: ['equipment_id', 'name', 'serial_number', 'location'] },
        { model: User, as: 'technician', attributes: ['user_id', 'name', 'role'] },
        { model: FaultReport, as: 'faultReport' },
      ],
    });

    return res.status(200).json({
      success: true,
      data: {
        total: count,
        page: parseInt(page, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)),
        logs,
      },
    });
  } catch (err) {
    next(err);
  }
};
