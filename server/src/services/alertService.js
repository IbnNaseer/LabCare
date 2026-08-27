const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

if (env.smtp.host && env.smtp.user) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
}

/**
 * Sends a high risk alert email to technician or staff.
 *
 * @param {string} technicianEmail
 * @param {Object} equipment
 * @param {number} ehi
 */
async function sendHighRiskAlert(technicianEmail, equipment, ehi) {
  if (!transporter) {
    console.log(`[AlertService Mock] High risk alert for ${equipment.name} (${equipment.serial_number}) - EHI: ${ehi}% -> Sent to: ${technicianEmail}`);
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to: technicianEmail,
      subject: `🚨 High Risk Alert: ${equipment.name} (${equipment.serial_number})`,
      text: `Equipment Health Alert:\n\n` +
        `Equipment: ${equipment.name}\n` +
        `Serial Number: ${equipment.serial_number}\n` +
        `Location: ${equipment.location || 'N/A'}\n` +
        `Current EHI: ${ehi}%\n` +
        `Risk Level: High\n\n` +
        `Immediate preventative maintenance is recommended. Please review in LabCare.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1f2937;">
          <h2 style="color: #ef4444;">🚨 High Risk Equipment Alert</h2>
          <p>The following laboratory equipment has reached a critical health threshold:</p>
          <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
            <tr><td style="padding: 8px; font-weight: bold;">Equipment:</td><td style="padding: 8px;">${equipment.name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Serial Number:</td><td style="padding: 8px;">${equipment.serial_number}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Location:</td><td style="padding: 8px;">${equipment.location || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Current Health Index (EHI):</td><td style="padding: 8px; color: #ef4444; font-weight: bold;">${ehi}%</td></tr>
          </table>
          <p style="margin-top: 20px;">Please schedule preventative maintenance immediately.</p>
        </div>
      `,
    });
    console.log(`[AlertService] Email alert sent: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`[AlertService Error] Failed to send email alert:`, err.message);
    return false;
  }
}

module.exports = {
  sendHighRiskAlert,
};
