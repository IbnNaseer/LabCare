const bcrypt = require('bcrypt');
const { sequelize, User, Equipment, ClassSchedule, FaultReport, MaintenanceLog, Prediction } = require('../src/models');
const { generateQR } = require('../src/services/qrService');
const { calculateEHI } = require('../src/services/ehiService');

async function seed() {
  try {
    console.log('[Seeder] Connecting and clearing old records...');
    await sequelize.sync({ force: true });

    console.log('[Seeder] Creating demo users for all 4 roles...');
    const passwordHash = await bcrypt.hash('password123', 12);

    const admin = await User.create({
      name: 'Dr. Aminu Bello (Admin)',
      email: 'admin@fud.edu.ng',
      password_hash: passwordHash,
      role: 'Admin',
    });

    const technologist = await User.create({
      name: 'Aliyu Ammani (Technologist)',
      email: 'tech@fud.edu.ng',
      password_hash: passwordHash,
      role: 'Technologist',
    });

    const engineer = await User.create({
      name: 'Engr. Fatima Musa',
      email: 'engineer@fud.edu.ng',
      password_hash: passwordHash,
      role: 'Engineer',
    });

    const student = await User.create({
      name: 'Ibrahim Yusuf (Student)',
      email: 'student@fud.edu.ng',
      password_hash: passwordHash,
      role: 'Student',
    });

    console.log('[Seeder] Creating laboratory equipment assets & generating QR tags...');

    const equipmentData = [
      {
        name: 'Olympus CX23 Biological Microscope',
        category: 'Microscopy',
        serial_number: 'SN-MC-89240',
        location: 'Biology Lab 1, Bench 3',
        purchase_date: '2024-01-15',
        expected_lifespan_hours: 4000,
        operational_hours: 1250,
        status: 'Active',
      },
      {
        name: 'Shimadzu UV-1800 Spectrophotometer',
        category: 'Spectrometry',
        serial_number: 'SN-SP-44102',
        location: 'Chemistry Research Lab, Bay 2',
        purchase_date: '2023-08-20',
        expected_lifespan_hours: 3000,
        operational_hours: 2850,
        status: 'Active', 
      },
      {
        name: 'Thermo Scientific Medifuge Centrifuge',
        category: 'Centrifuges',
        serial_number: 'SN-CF-11938',
        location: 'Biochemistry Lab 2',
        purchase_date: '2024-03-10',
        expected_lifespan_hours: 5000,
        operational_hours: 800,
        status: 'Active',
      },
      {
        name: 'Mettler Toledo Precision Balance MS204TS',
        category: 'Measurement',
        serial_number: 'SN-BL-77341',
        location: 'Physical Chemistry Lab',
        purchase_date: '2024-05-02',
        expected_lifespan_hours: 6000,
        operational_hours: 450,
        status: 'Active',
      },
      {
        name: 'Heidolph Hei-VAP Rotary Evaporator',
        category: 'Thermal / Heat',
        serial_number: 'SN-EV-90214',
        location: 'Organic Synthesis Lab',
        purchase_date: '2022-11-10',
        expected_lifespan_hours: 3500,
        operational_hours: 3200,
        status: 'Under Repair',
      },
      {
        name: 'Dell Precision 3660 Data Acquisition Workstation',
        category: 'Computing',
        serial_number: 'SN-PC-55091',
        location: 'Instrumentation Lab',
        purchase_date: '2023-02-14',
        expected_lifespan_hours: 10000,
        operational_hours: 3400,
        status: 'Active',
      }
    ];

    const createdEquipment = [];
    for (const item of equipmentData) {
      const eq = await Equipment.create(item);
      const qrPayload = await generateQR(eq.equipment_id, eq.serial_number);
      eq.qr_code = qrPayload;
      await eq.save();
      createdEquipment.push(eq);
    }

    console.log('[Seeder] Creating class schedules for usage estimation...');
    await ClassSchedule.bulkCreate([
      { equipment_id: createdEquipment[0].equipment_id, lab_name: 'Biology Lab 1', session_day: 'Mon', start_time: '09:00:00', end_time: '12:00:00', duration_hours: 3.0 },
      { equipment_id: createdEquipment[0].equipment_id, lab_name: 'Biology Lab 1', session_day: 'Wed', start_time: '14:00:00', end_time: '17:00:00', duration_hours: 3.0 },
      { equipment_id: createdEquipment[1].equipment_id, lab_name: 'Chemistry Lab', session_day: 'Tue', start_time: '10:00:00', end_time: '14:00:00', duration_hours: 4.0 },
      { equipment_id: createdEquipment[2].equipment_id, lab_name: 'Biochem Lab 2', session_day: 'Thu', start_time: '08:00:00', end_time: '11:00:00', duration_hours: 3.0 },
    ]);

    console.log('[Seeder] Creating sample fault reports and maintenance logs...');
    const report1 = await FaultReport.create({
      equipment_id: createdEquipment[4].equipment_id, 
      reported_by: student.user_id,
      description: '[Thermal / Heat] Vacuum seal leakage and heating bath temperature fluctuation during distillation.',
      priority: 'High',
      status: 'In-Progress',
    });

    const report2 = await FaultReport.create({
      equipment_id: createdEquipment[1].equipment_id, 
      reported_by: technologist.user_id,
      description: '[Display / Output Issue] Deuterium lamp intensity low, baseline noise exceeds calibration limits.',
      priority: 'Medium',
      status: 'Resolved',
      resolved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });

    await MaintenanceLog.create({
      equipment_id: createdEquipment[1].equipment_id,
      technician_id: engineer.user_id,
      fault_report_id: report2.report_id,
      action_taken: 'Replaced deuterium D2 lamp assembly and re-calibrated wavelength zero point.',
      parts_used: 'Hamamatsu D2 Lamp L6380',
      service_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      cost: 45000.00,
    });

    console.log('[Seeder] Computing initial EHI snapshots for all assets...');
    for (const eq of createdEquipment) {
      const failureCount = await FaultReport.count({
        where: { equipment_id: eq.equipment_id, status: ['Resolved', 'Scrapped'] }
      });

      const { ehi, riskLevel } = calculateEHI({
        operationalHours: parseFloat(eq.operational_hours),
        expectedLifespanHours: eq.expected_lifespan_hours,
        failureCount,
        daysSinceLastService: 45,
      });

      await Prediction.create({
        equipment_id: eq.equipment_id,
        ehi_score: ehi,
        risk_level: riskLevel,
        computed_at: new Date(),
      });
    }

    console.log('\n======================================================');
    console.log('  🎉 DEMO DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Demo Login Accounts (Password for all is: password123)');
    console.log('  👑 Admin:        admin@fud.edu.ng');
    console.log('  🔬 Technologist: tech@fud.edu.ng');
    console.log('  ⚙️ Engineer:     engineer@fud.edu.ng');
    console.log('  🎓 Student:      student@fud.edu.ng');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('[Seeder Error]', err);
    process.exit(1);
  }
}

seed();
