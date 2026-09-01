const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const QR_OUTPUT_DIR = path.join(__dirname, '..', '..', '..', 'client', 'public', 'qrcodes');

if (!fs.existsSync(QR_OUTPUT_DIR)) {
  fs.mkdirSync(QR_OUTPUT_DIR, { recursive: true });
}

async function generateQR(equipmentId, serialNumber) {
  const payload = `EQUIP-${equipmentId}-${serialNumber}`;
  const filePath = path.join(QR_OUTPUT_DIR, `${payload}.png`);
  await QRCode.toFile(filePath, payload, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 2,
    width: 300,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
  return payload;
}

module.exports = {
  generateQR,
};
