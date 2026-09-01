const { Op } = require('sequelize');
const { FaultReport, Equipment, User, MaintenanceLog } = require('../models');
const { recalculateSingleEquipment } = require('../services/ehiService');

exports.create = async (req, res, next) => {
  try {
    const { equipment_id, description, priority = 'Medium' } = req.body;

    if (!equipment_id || !description) {
      return res.status(400).json({
        success: false,
        error: 'Equipment ID and fault description are required',
      });
    }

    const equipment = await Equipment.findByPk(equipment_id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found',
      });
    }

    if (equipment.status === 'Scrapped') {
      return res.status(400).json({
        success: false,
        error: 'This equipment is decommissioned/scrapped and cannot receive new fault reports.',
      });
    }

    const activeFault = await FaultReport.findOne({
      where: {
        equipment_id: parseInt(equipment_id, 10),
        status: { [Op.in]: ['Pending', 'In-Progress'] },
      },
      include: [
        { model: User, as: 'reporter', attributes: ['name'] },
      ],
    });

    if (activeFault) {
      return res.status(409).json({
        success: false,
        error: `This equipment (${equipment.name}) already has an active fault report (#${activeFault.report_id} - ${activeFault.status}). Duplicate reports are blocked until the current issue is resolved.`,
        data: {
          activeReportId: activeFault.report_id,
          status: activeFault.status,
          priority: activeFault.priority,
          reportedAt: activeFault.created_at,
        },
      });
    }

    let image_path = null;
    if (req.file) {
      image_path = `/uploads/fault-reports/${req.file.filename}`;
    }

    const report = await FaultReport.create({
      equipment_id: parseInt(equipment_id, 10),
      reported_by: req.user.user_id,
      description,
      priority,
      image_path,
      status: 'Pending',
    });

    if (equipment.status !== 'Under Repair') {
      equipment.status = 'Under Repair';
      await equipment.save();
    }

    const populatedReport = await FaultReport.findByPk(report.report_id, {
      include: [
        { model: Equipment, as: 'equipment', attributes: ['equipment_id', 'name', 'serial_number', 'location'] },
        { model: User, as: 'reporter', attributes: ['user_id', 'name', 'email', 'role'] },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Fault report submitted successfully',
      data: populatedReport,
    });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { status, priority, equipment_id, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = {};

    if (req.user.role === 'Student') {
      where.reported_by = req.user.user_id;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (equipment_id) {
      where.equipment_id = equipment_id;
    }

    if (search && search.trim()) {
      where.description = { [Op.like]: `%${search.trim()}%` };
    }

    const equipmentInclude = {
      model: Equipment,
      as: 'equipment',
      attributes: ['equipment_id', 'name', 'serial_number', 'location'],
    };

    if (search && search.trim()) {

      delete where.description;
      where[Op.or] = [
        { description: { [Op.like]: `%${search.trim()}%` } },
        { '$equipment.name$': { [Op.like]: `%${search.trim()}%` } },
        { '$equipment.serial_number$': { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const { count, rows: reports } = await FaultReport.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['created_at', 'DESC']],
      include: [
        equipmentInclude,
        { model: User, as: 'reporter', attributes: ['user_id', 'name', 'email', 'role'] },
      ],
      subQuery: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        total: count,
        page: parseInt(page, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)),
        reports,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await FaultReport.findByPk(id, {
      include: [
        { model: Equipment, as: 'equipment' },
        { model: User, as: 'reporter', attributes: ['user_id', 'name', 'email', 'role'] },
        {
          model: MaintenanceLog,
          as: 'maintenanceLogs',
          include: [{ model: User, as: 'technician', attributes: ['user_id', 'name', 'role'] }],
        },
      ],
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Fault report not found',
      });
    }

    if (req.user.role === 'Student' && report.reported_by !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only view your own fault reports',
      });
    }

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'In-Progress', 'Resolved', 'Scrapped'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const report = await FaultReport.findByPk(id, {
      include: [{ model: Equipment, as: 'equipment' }],
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Fault report not found',
      });
    }

    report.status = status;
    if (status === 'Resolved') {
      report.resolved_at = new Date();

      if (report.equipment && report.equipment.status === 'Under Repair') {
        const activeFaultsCount = await FaultReport.count({
          where: {
            equipment_id: report.equipment_id,
            status: { [Op.in]: ['Pending', 'In-Progress'] },
            report_id: { [Op.ne]: report.report_id },
          },
        });
        if (activeFaultsCount === 0) {
          report.equipment.status = 'Active';
          await report.equipment.save();
        }
      }
    } else if (status === 'In-Progress') {
      if (report.equipment && report.equipment.status === 'Active') {
        report.equipment.status = 'Under Repair';
        await report.equipment.save();
      }
    } else if (status === 'Scrapped') {
      if (report.equipment) {
        report.equipment.status = 'Scrapped';
        await report.equipment.save();
      }
    }

    await report.save();

    await recalculateSingleEquipment(report.equipment_id);

    return res.status(200).json({
      success: true,
      message: `Report status updated to ${status}`,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await FaultReport.findByPk(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Fault report not found',
      });
    }

    if (report.status === 'In-Progress') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete an In-Progress fault report. Please resolve or scrap it first.',
      });
    }

    await report.destroy();

    return res.status(200).json({
      success: true,
      message: 'Fault report deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
