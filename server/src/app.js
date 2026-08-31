const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const faultReportRoutes = require('./routes/faultReportRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded fault images statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve client frontend statically
app.use(express.static(path.join(__dirname, '..', '..', 'client')));

// Root redirect to login page
app.get('/', (req, res) => {
  res.redirect('/views/login.html');
});

// Health check endpoint
app.get('/api/v1/health', (req, res) => {

  res.status(200).json({
    status: 'ok',
    system: 'LabCare API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/equipment', equipmentRoutes);
app.use('/api/v1/fault-reports', faultReportRoutes);
app.use('/api/v1/maintenance-logs', maintenanceRoutes);
app.use('/api/v1/predictions', predictionRoutes);
app.use('/api/v1/users', userRoutes);

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
