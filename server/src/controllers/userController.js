const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const { User, FaultReport, MaintenanceLog } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = {};

    if (role) {
      where.role = role;
    }

    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search.trim()}%` } },
        { email: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: ['user_id', 'name', 'email', 'role', 'created_at'],
      limit: parseInt(limit, 10),
      offset,
      order: [['created_at', 'DESC']],
    });

    // Compute role count distribution for KPI cards
    const [totalStudents, totalTechs, totalEngineers, totalAdmins] = await Promise.all([
      User.count({ where: { role: 'Student' } }),
      User.count({ where: { role: 'Technologist' } }),
      User.count({ where: { role: 'Engineer' } }),
      User.count({ where: { role: 'Admin' } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total: count,
        page: parseInt(page, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)),
        users,
        stats: {
          total: count,
          students: totalStudents,
          technologists: totalTechs,
          engineers: totalEngineers,
          admins: totalAdmins,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: ['user_id', 'name', 'email', 'role', 'created_at'],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, email, password, role = 'Student' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required',
      });
    }

    const validRoles = ['Student', 'Technologist', 'Engineer', 'Admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email address already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      role,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({
        where: {
          email: email.toLowerCase().trim(),
          user_id: { [Op.ne]: id },
        },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'This email is already in use by another user account',
        });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }

    if (role) {
      const validRoles = ['Student', 'Technologist', 'Engineer', 'Admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        });
      }

      // Prevent removing the last admin
      if (user.role === 'Admin' && role !== 'Admin') {
        const adminCount = await User.count({ where: { role: 'Admin' } });
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            error: 'Cannot demote the only system Administrator account',
          });
        }
      }

      user.role = role;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User details updated successfully',
      data: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    user.password_hash = await bcrypt.hash(new_password, 12);
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Password for ${user.name} was successfully reset`,
    });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.user_id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own Administrator account',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (user.role === 'Admin') {
      const adminCount = await User.count({ where: { role: 'Admin' } });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the only system Administrator account',
        });
      }
    }

    // Check if user has associated fault reports or maintenance logs
    const [faultCount, logCount] = await Promise.all([
      FaultReport.count({ where: { reported_by: id } }),
      MaintenanceLog.count({ where: { technician_id: id } }),
    ]);

    if (faultCount > 0 || logCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete user: this user has recorded activity (${faultCount} fault reports, ${logCount} maintenance logs). Keep account for audit integrity.`,
      });
    }

    await user.destroy();

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
