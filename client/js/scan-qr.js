let html5QrCode = null;
let resolvedEquipment = null;

async function initScanner() {
  const proceedBtn = document.getElementById('proceed-fault-btn');
  const manualInput = document.getElementById('manual-qr-input');
  const manualBtn = document.getElementById('manual-lookup-btn');
  const snapBtn = document.getElementById('snap-qr-btn');
  const fileInput = document.getElementById('qr-file-input');

  // Manual search handlers
  if (manualBtn && manualInput) {
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
  }

  // Proceed button handler
  if (proceedBtn) {
    proceedBtn.addEventListener('click', () => {
      if (resolvedEquipment) {
        sessionStorage.setItem('selected_equipment', JSON.stringify(resolvedEquipment));
        window.location.href = `report-fault.html?equipment_id=${resolvedEquipment.equipment_id}`;
      }
    });
  }

  // Initialize Html5Qrcode instance
  if (typeof Html5Qrcode !== 'undefined') {
    html5QrCode = new Html5Qrcode('qr-reader');

    // Snap Photo / File Upload Handler (Works 100% on all mobile devices & HTTP)
    if (snapBtn && fileInput) {
      snapBtn.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const imageFile = e.target.files[0];
          try {
            api.showToast('Scanning image...', 'info');
            const decodedText = await html5QrCode.scanFile(imageFile, false);
            console.log('QR decoded from image:', decodedText);
            resolveQrCode(decodedText);
          } catch (err) {
            console.warn('Failed to decode QR from image:', err);
            api.showToast('Could not read QR code from image. Please ensure code is clear and in focus, or enter tag manually.', 'error');
          }
        }
      });
    }

    // Try starting live webcam/video stream
    try {
      const config = { fps: 10, qrbox: { width: 220, height: 220 } };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          console.log('QR Scanned from camera:', decodedText);
          resolveQrCode(decodedText);
        },
        (errorMessage) => {
          // ignore scan frame misses
        }
      );
    } catch (err) {
      console.warn('Live camera stream not supported or permission denied:', err);
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
