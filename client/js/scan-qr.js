let html5QrCode = null;
let resolvedEquipment = null;

async function initScanner() {
  const resultCard = document.getElementById('scanned-result-card');
  const emptyState = document.getElementById('scanner-empty-state');
  const proceedBtn = document.getElementById('proceed-fault-btn');
  const manualInput = document.getElementById('manual-qr-input');
  const manualBtn = document.getElementById('manual-lookup-btn');

  manualBtn.addEventListener('click', () => {
    const code = manualInput.value.trim();
    if (code) resolveQrCode(code);
  });

  manualInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const code = manualInput.value.trim();
      if (code) resolveQrCode(code);
    }
  });

  proceedBtn.addEventListener('click', () => {
    if (resolvedEquipment) {
      sessionStorage.setItem('selected_equipment', JSON.stringify(resolvedEquipment));
      window.location.href = `report-fault.html?equipment_id=${resolvedEquipment.equipment_id}`;
    }
  });

  if (typeof Html5Qrcode !== 'undefined') {
    try {
      html5QrCode = new Html5Qrcode('qr-reader');
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          console.log('QR Scanned:', decodedText);
          resolveQrCode(decodedText);
        },
        (errorMessage) => {
          // scanning frame error (ignored)
        }
      );
    } catch (err) {
      console.warn('Camera access error or unsupported:', err);
      const errEl = document.getElementById('camera-error-msg');
      if (errEl) errEl.style.display = 'block';
    }
  }
}

async function resolveQrCode(qrCodeString) {
  const resultCard = document.getElementById('scanned-result-card');
  const emptyState = document.getElementById('scanner-empty-state');
  const proceedBtn = document.getElementById('proceed-fault-btn');
  const errorMsg = document.getElementById('qr-resolve-error');

  if (errorMsg) errorMsg.style.display = 'none';

  try {
    const res = await api.get(`/equipment/qr/${encodeURIComponent(qrCodeString)}`);
    if (res.success && res.data) {
      resolvedEquipment = res.data;

      document.getElementById('res-name').textContent = resolvedEquipment.name;
      document.getElementById('res-serial').textContent = resolvedEquipment.serial_number;
      document.getElementById('res-category').textContent = resolvedEquipment.category || 'Laboratory Device';
      document.getElementById('res-location').textContent = resolvedEquipment.location || 'Main Laboratory';
      document.getElementById('res-status').textContent = resolvedEquipment.status;
      
      const statusPill = document.getElementById('res-status-pill');
      if (statusPill) {
        statusPill.className = `badge-pill ${resolvedEquipment.status === 'Active' ? 'status-active' : 'status-under-repair'}`;
      }

      emptyState.style.display = 'none';
      resultCard.style.display = 'block';
      proceedBtn.disabled = false;
      proceedBtn.style.opacity = '1';

      api.showToast(`Found: ${resolvedEquipment.name}`, 'success');
    }
  } catch (err) {
    resolvedEquipment = null;
    proceedBtn.disabled = true;
    proceedBtn.style.opacity = '0.5';
    if (errorMsg) {
      errorMsg.style.display = 'block';
      errorMsg.textContent = 'QR code not recognized. Please scan again or enter asset code manually.';
    }
  }
}
