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

  // Snap Photo / File Upload Handler
  if (snapBtn && fileInput) {
    snapBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const imageFile = e.target.files[0];
        api.showToast('Analyzing photo...', 'info');
        
        try {
          const decodedText = await decodeQrWithMultiPass(imageFile);
          if (decodedText) {
            console.log('✅ QR Decoded successfully:', decodedText);
            resolveQrCode(decodedText);
          } else {
            throw new Error('QR code not detected in image');
          }
        } catch (err) {
          console.warn('QR decode failed:', err);
          api.showToast('Could not read QR from photo. Please hold steady and closer to the QR code, or enter tag manually.', 'error');
        }
      }
    });
  }

  // Initialize Html5Qrcode instance for live camera streaming
  if (typeof Html5Qrcode !== 'undefined') {
    html5QrCode = new Html5Qrcode('qr-reader');

    try {
      const config = { fps: 10, qrbox: { width: 220, height: 220 } };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          console.log('QR Scanned from camera stream:', decodedText);
          resolveQrCode(decodedText);
        },
        (errorMessage) => {
          // ignore scan frame misses
        }
      );
    } catch (err) {
      console.warn('Live camera stream blocked or unsupported (requires HTTPS):', err);
      const errEl = document.getElementById('camera-error-msg');
      if (errEl) errEl.style.display = 'block';
    }
  }
}

/**
 * Multi-Pass Adaptive Image Decoder
 * Handles raw smartphone high-resolution (12MP-50MP) photos with multi-scale downsampling
 * and contrast enhancement passes using jsQR.
 */
async function decodeQrWithMultiPass(file) {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Pass 1: Scale down to 1200px max dimension (Optimal for smartphone photos)
  let code = scanCanvasAtScale(img, canvas, ctx, 1200, false);
  if (code) return code;

  // Pass 2: Scale down to 800px max dimension
  code = scanCanvasAtScale(img, canvas, ctx, 800, false);
  if (code) return code;

  // Pass 3: Scale down to 600px with High-Contrast Binarization Filter
  code = scanCanvasAtScale(img, canvas, ctx, 600, true);
  if (code) return code;

  // Pass 4: Original dimensions (if smaller than 1200px)
  code = scanCanvasAtScale(img, canvas, ctx, Math.max(img.width, img.height), false);
  if (code) return code;

  // Pass 5: html5-qrcode fallback
  if (html5QrCode && typeof html5QrCode.scanFile === 'function') {
    try {
      return await html5QrCode.scanFile(file, false);
    } catch (e) {}
  }

  return null;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function scanCanvasAtScale(img, canvas, ctx, maxDimension, applyContrast = false) {
  if (typeof jsQR === 'undefined') return null;

  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);

  if (applyContrast) {
    // Contrast boost & grayscale binarization to eliminate shadows
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const binary = gray > 128 ? 255 : 0;
      data[i] = binary;
      data[i + 1] = binary;
      data[i + 2] = binary;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  const qrResult = jsQR(imageData.data, width, height, {
    inversionAttempts: 'attemptBoth',
  });

  return qrResult ? qrResult.data : null;
}

async function resolveQrCode(qrCodeString) {
  const resultCard = document.getElementById('scanned-result-card');
  const emptyState = document.getElementById('scanner-empty-state');
  const proceedBtn = document.getElementById('proceed-fault-btn');
  const errorMsg = document.getElementById('qr-resolve-error');
  const lookupBtn = document.getElementById('manual-lookup-btn');

  if (errorMsg) errorMsg.style.display = 'none';

  let originalBtnHtml = '';
  if (lookupBtn) {
    originalBtnHtml = lookupBtn.innerHTML;
    lookupBtn.disabled = true;
    lookupBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
  }

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
      errorMsg.textContent = err.message || `No equipment found matching "${qrCodeString}". Please check the serial number.`;
    }
    api.showToast(err.message || 'Equipment not recognized', 'error');
  } finally {
    if (lookupBtn) {
      lookupBtn.disabled = false;
      lookupBtn.innerHTML = originalBtnHtml || '<i class="bi bi-search"></i> Lookup';
    }
  }
}
