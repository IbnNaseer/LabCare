const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const env = require('../config/env');

const generateToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required',
      });
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists',
      });
    }

    // Role handling: Only Admin can create non-Student accounts
    let assignedRole = 'Student';
    const totalUsers = await User.count();
    
    // First user ever created in the system becomes Admin automatically
    if (totalUsers === 0) {
      assignedRole = 'Admin';
    } else if (req.user && req.user.role === 'Admin' && role) {
      assignedRole = role;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: assignedRole,
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
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
