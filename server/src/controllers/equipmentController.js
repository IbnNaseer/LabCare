const { Op } = require('sequelize');
const { Equipment, FaultReport, MaintenanceLog, Prediction, ClassSchedule, User } = require('../models');
const { generateQR } = require('../services/qrService');
const { calculateEHI } = require('../services/ehiService');

exports.list = async (req, res, next) => {
  try {
    const { search, category, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { serial_number: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const { count, rows: equipmentList } = await Equipment.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Prediction,
          as: 'predictions',
          limit: 1,
          order: [['computed_at', 'DESC']],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: {
        total: count,
        page: parseInt(page, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)),
        equipment: equipmentList,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const equipment = await Equipment.findByPk(id, {
      include: [
        {
          model: Prediction,
          as: 'predictions',
          limit: 10,
          order: [['computed_at', 'DESC']],
        },
        {
          model: ClassSchedule,
          as: 'classSchedules',
        },
      ],
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found',
      });
    }

    // Compute live/current EHI snapshot
    const failureCount = await FaultReport.count({
      where: {
        equipment_id: equipment.equipment_id,
        status: { [Op.in]: ['Resolved', 'Scrapped'] },
      },
    });

    const lastMaintenance = await MaintenanceLog.findOne({
      where: { equipment_id: equipment.equipment_id },
      order: [['service_date', 'DESC']],
    });

    let daysSinceLastService = 0;
    if (lastMaintenance && lastMaintenance.service_date) {
      const diffMs = Date.now() - new Date(lastMaintenance.service_date).getTime();
      daysSinceLastService = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } else if (equipment.purchase_date) {
      const diffMs = Date.now() - new Date(equipment.purchase_date).getTime();
      daysSinceLastService = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    const currentEHI = calculateEHI({
      operationalHours: parseFloat(equipment.operational_hours),
      expectedLifespanHours: equipment.expected_lifespan_hours,
      failureCount,
      daysSinceLastService,
    });

    return res.status(200).json({
      success: true,
      data: {
        equipment,
        currentEHI,
        note: 'Operational hours and EHI are estimated from class schedules and historical logs, not hardware sensors.',
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getByQR = async (req, res, next) => {
  try {
    const { qrCode } = req.params;

    const equipment = await Equipment.findOne({
      where: { qr_code: qrCode },
      include: [
        {
          model: Prediction,
          as: 'predictions',
          limit: 1,
          order: [['computed_at', 'DESC']],
        },
      ],
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment with this QR code was not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: equipment,
    });
  } catch (err) {
    next(err);
  }
};

const generateSerialNumber = async (category = '') => {
  const categoryPrefixes = {
    'Microscopy': 'SN-MC',
    'Spectrometry': 'SN-SP',
    'Centrifuges': 'SN-CF',
    'Thermal / Heat': 'SN-EV',
    'Measurement': 'SN-BL',
    'Computing': 'SN-PC',
  };

  const prefix = categoryPrefixes[category] || 'SN-EQ';

  for (let attempts = 0; attempts < 10; attempts++) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const candidate = `${prefix}-${randomNum}`;
    const exists = await Equipment.findOne({ where: { serial_number: candidate } });
    if (!exists) {
      return candidate;
    }
  }

  return `${prefix}-${Date.now().toString().slice(-6)}`;
};

const convertLifespanToHours = (value, unit = 'Years') => {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return 6000;
  if (unit === 'Months') {
    return Math.round(num * (2000 / 12));
  } else if (unit === 'Hours') {
    return Math.round(num);
  }
  // Default is Years
  return Math.round(num * 2000);
};

exports.create = async (req, res, next) => {
  try {
    let {
      name,
      category,
      serial_number,
      location,
      purchase_date,
      expected_lifespan_hours,
      lifespan_value,
      lifespan_unit = 'Years',
      operational_hours = 0,
      status = 'Active',
    } = req.body;

    if (lifespan_value) {
      expected_lifespan_hours = convertLifespanToHours(lifespan_value, lifespan_unit);
    }

    if (!name || !expected_lifespan_hours) {
      return res.status(400).json({
        success: false,
        error: 'Name and expected lifespan are required',
      });
    }

    // Auto-generate serial number if blank or omitted
    if (!serial_number || !serial_number.trim()) {
      serial_number = await generateSerialNumber(category);
    } else {
      serial_number = serial_number.trim();
      const existing = await Equipment.findOne({ where: { serial_number } });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Equipment with this serial number already exists',
        });
      }
    }

    const equipment = await Equipment.create({
      name: name.trim(),
      category,
      serial_number,
      location: location ? location.trim() : null,
      purchase_date: purchase_date || null,
      expected_lifespan_hours: parseInt(expected_lifespan_hours, 10),
      operational_hours: parseFloat(operational_hours) || 0,
      status,
    });

    // Auto-generate QR code
    const qrPayload = await generateQR(equipment.equipment_id, equipment.serial_number);
    equipment.qr_code = qrPayload;
    await equipment.save();

    // Generate initial baseline prediction snapshot
    const initialEHI = calculateEHI({
      operationalHours: parseFloat(equipment.operational_hours),
      expectedLifespanHours: equipment.expected_lifespan_hours,
      failureCount: 0,
      daysSinceLastService: 0,
    });

    await Prediction.create({
      equipment_id: equipment.equipment_id,
      ehi_score: initialEHI.ehi,
      risk_level: initialEHI.riskLevel,
      computed_at: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Equipment created and QR code generated successfully',
      data: equipment,
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    let {
      name,
      category,
      location,
      purchase_date,
      expected_lifespan_hours,
      lifespan_value,
      lifespan_unit = 'Years',
      operational_hours,
      status,
    } = req.body;

    if (lifespan_value) {
      expected_lifespan_hours = convertLifespanToHours(lifespan_value, lifespan_unit);
    }

    const equipment = await Equipment.findByPk(id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found',
      });
    }

    let categoryChanged = false;
    if (category !== undefined && category !== equipment.category) {
      categoryChanged = true;
      equipment.category = category;
      // Regenerate serial number and QR code for the new category
      const newSerial = await generateSerialNumber(category);
      equipment.serial_number = newSerial;
      const newQr = await generateQR(equipment.equipment_id, newSerial);
      equipment.qr_code = newQr;
    }

    if (name !== undefined) equipment.name = name.trim();
    if (location !== undefined) equipment.location = location ? location.trim() : null;
    if (purchase_date !== undefined) equipment.purchase_date = purchase_date || null;
    if (expected_lifespan_hours !== undefined) equipment.expected_lifespan_hours = parseInt(expected_lifespan_hours, 10);
    if (operational_hours !== undefined) equipment.operational_hours = parseFloat(operational_hours);
    if (status !== undefined) equipment.status = status;

    await equipment.save();

    // Recalculate EHI snapshot
    const failureCount = await FaultReport.count({
      where: { equipment_id: equipment.equipment_id, status: ['Resolved', 'Scrapped'] }
    });

    const currentEHI = calculateEHI({
      operationalHours: parseFloat(equipment.operational_hours),
      expectedLifespanHours: equipment.expected_lifespan_hours,
      failureCount,
      daysSinceLastService: 30,
    });

    await Prediction.create({
      equipment_id: equipment.equipment_id,
      ehi_score: currentEHI.ehi,
      risk_level: currentEHI.riskLevel,
      computed_at: new Date(),
    });

    const message = categoryChanged
      ? `Equipment updated! Category changed: New Serial (${equipment.serial_number}) & QR tag generated.`
      : 'Equipment updated successfully';

    return res.status(200).json({
      success: true,
      message,
      data: equipment,
    });
  } catch (err) {
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const equipment = await Equipment.findByPk(id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found',
      });
    }

    const faults = await FaultReport.findAll({
      where: { equipment_id: id },
      include: [{ model: User, as: 'reporter', attributes: ['user_id', 'name', 'role'] }],
      order: [['created_at', 'DESC']],
    });

    const maintenance = await MaintenanceLog.findAll({
      where: { equipment_id: id },
      include: [{ model: User, as: 'technician', attributes: ['user_id', 'name', 'role'] }],
      order: [['service_date', 'DESC']],
    });

    // Merge chronologically for the Equipment Details "History" tab
    const timeline = [];

    faults.forEach((f) => {
      timeline.push({
        type: 'FaultReport',
        id: f.report_id,
        date: f.created_at,
        event: `Fault Reported (${f.priority})`,
        status: f.status,
        performedBy: f.reporter ? f.reporter.name : 'Unknown',
        notes: f.description,
      });
      if (f.resolved_at) {
        timeline.push({
          type: 'FaultResolved',
          id: f.report_id,
          date: f.resolved_at,
          event: 'Fault Resolved',
          status: 'Resolved',
          performedBy: 'Maintenance Staff',
          notes: `Resolved fault #${f.report_id}`,
        });
      }
    });

    maintenance.forEach((m) => {
      timeline.push({
        type: 'Maintenance',
        id: m.log_id,
        date: m.service_date,
        event: 'Maintenance Service',
        status: 'Completed',
        performedBy: m.technician ? m.technician.name : 'Unknown',
        notes: `${m.action_taken || ''}${m.parts_used ? ` (Parts: ${m.parts_used})` : ''}`,
        cost: m.cost,
      });
    });

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json({
      success: true,
      data: {
        equipment_id: id,
        timeline,
      },
    });
  } catch (err) {
    next(err);
  }
};
