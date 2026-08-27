const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const requiredEnvVars = [
  'JWT_SECRET',
  'DB_NAME',
  'DB_USER',
];

const missingVars = requiredEnvVars.filter((key) => !process.env[key] && process.env.NODE_ENV === 'production');
if (missingVars.length > 0) {
  console.warn(`[Config Warning] Missing required environment variables: ${missingVars.join(', ')}`);
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    name: process.env.DB_NAME || 'lab_fault_system',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'labcare_default_dev_secret_key_12345',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.ALERT_FROM || 'alerts@labfaultsystem.local',
  },
};
