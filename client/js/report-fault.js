let currentStep = 1;
let selectedEquipment = null;
let selectedPriority = 'Medium';
let uploadedFile = null;
let equipmentList = [];

async function initReportWizard() {
  await loadEquipmentList();

  const urlParams = new URLSearchParams(window.location.search);
  const equipId = urlParams.get('equipment_id');

  if (equipId) {
    const found = equipmentList.find(e => e.equipment_id === parseInt(equipId, 10));
    if (found) {
      selectEquipment(found);
      goToStep(2);
    }
  } else {
    const stored = sessionStorage.getItem('selected_equipment');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        selectEquipment(parsed);
        sessionStorage.removeItem('selected_equipment');
        goToStep(2);
      } catch (e) {}
    }
  }

  setupEventListeners();
}

async function loadEquipmentList() {
  try {
    const res = await api.get('/equipment', { limit: 100 });
    if (res.success && res.data) {
      equipmentList = res.data.equipment || [];
      const select = document.getElementById('wizard-equip-select');
      if (select) {
        select.innerHTML = '<option value="">-- Choose laboratory equipment --</option>' +
          equipmentList.map(e => `<option value="${e.equipment_id}">${e.name} (SN: ${e.serial_number} &bull; ${e.location || 'Lab'})</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load equipment:', err);
  }
}

function selectEquipment(equipment) {
  selectedEquipment = equipment;
  const select = document.getElementById('wizard-equip-select');
  if (select) select.value = equipment.equipment_id;

  const emptyEl = document.getElementById('preview-empty');
  const contentEl = document.getElementById('preview-content');

  if (emptyEl) emptyEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'block';

  document.getElementById('prev-name').textContent = equipment.name;
  document.getElementById('prev-serial').textContent = equipment.serial_number;
  document.getElementById('prev-category').textContent = equipment.category || 'N/A';
  document.getElementById('prev-location').textContent = equipment.location || 'N/A';
  document.getElementById('prev-status').textContent = equipment.status;
}

function setupEventListeners() {
  const equipSelect = document.getElementById('wizard-equip-select');
  if (equipSelect) {
    equipSelect.addEventListener('change', (e) => {
      const id = parseInt(e.target.value, 10);
      const equip = equipmentList.find(item => item.equipment_id === id);
      if (equip) {
        selectEquipment(equip);
      } else {
        selectedEquipment = null;
        document.getElementById('preview-empty').style.display = 'block';
        document.getElementById('preview-content').style.display = 'none';
      }
    });
  }

  document.querySelectorAll('.priority-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.priority-option').forEach(o => o.classList.remove('selected', 'low', 'medium', 'high', 'critical'));
      selectedPriority = opt.dataset.priority;
      opt.classList.add('selected', selectedPriority.toLowerCase());
    });
  });

  const fileInput = document.getElementById('fault-image-input');
  const dropzone = document.getElementById('image-dropzone');
  const previewContainer = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('image-preview-img');
  const removeImgBtn = document.getElementById('remove-img-btn');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });
  }

  if (removeImgBtn) {
    removeImgBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      uploadedFile = null;
      if (fileInput) fileInput.value = '';
      if (previewContainer) previewContainer.style.display = 'none';
      if (dropzone) dropzone.style.display = 'flex';
    });
  }

  function handleFile(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      api.showToast('Only JPEG, PNG, and WebP images are allowed', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      api.showToast('Image size exceeds 5MB limit', 'error');
      return;
    }

    uploadedFile = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (previewImg) previewImg.src = event.target.result;
      if (dropzone) dropzone.style.display = 'none';
      if (previewContainer) previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  const nextBtn = document.getElementById('wizard-next-btn');
  const prevBtn = document.getElementById('wizard-prev-btn');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (validateCurrentStep()) {
        if (currentStep < 4) {
          goToStep(currentStep + 1);
        } else {
          submitFaultReport();
        }
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentStep > 1) {
        goToStep(currentStep - 1);
      }
    });
  }
}

function validateCurrentStep() {
  if (currentStep === 1) {
    if (!selectedEquipment) {
      api.showToast('Please select an equipment item to continue', 'warning');
      return false;
    }
    return true;
  }

  if (currentStep === 2) {
    const desc = document.getElementById('fault-description').value.trim();
    if (!desc) {
      api.showToast('Please describe the fault or issue', 'warning');
      return false;
    }
    return true;
  }

  return true;
}

function goToStep(step) {
  currentStep = step;

  document.querySelectorAll('.wizard-step').forEach((el, index) => {
    const stepNum = index + 1;
    el.classList.remove('active', 'completed');
    if (stepNum === currentStep) {
      el.classList.add('active');
    } else if (stepNum < currentStep) {
      el.classList.add('completed');
    }
  });

  document.querySelectorAll('.step-panel').forEach(panel => panel.style.display = 'none');
  const activePanel = document.getElementById(`step-${currentStep}-panel`);
  if (activePanel) activePanel.style.display = 'block';

  const prevBtn = document.getElementById('wizard-prev-btn');
  const nextBtn = document.getElementById('wizard-next-btn');

  if (prevBtn) prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
  if (nextBtn) {
    if (currentStep === 4) {
      nextBtn.innerHTML = '<i class="bi bi-send-fill"></i> Submit Report';
      populateReviewStep();
    } else {
      nextBtn.innerHTML = 'Next &rarr;';
    }
  }
}

function populateReviewStep() {
  const faultType = document.getElementById('fault-type')?.value || 'General';
  const description = document.getElementById('fault-description')?.value.trim() || '';
  const affectsUsage = document.querySelector('input[name="affects_usage"]:checked')?.value || 'Yes';

  document.getElementById('rev-equipment').textContent = selectedEquipment?.name || '-';
  document.getElementById('rev-serial').textContent = selectedEquipment?.serial_number || '-';
  document.getElementById('rev-location').textContent = selectedEquipment?.location || '-';
  document.getElementById('rev-type').textContent = faultType;
  document.getElementById('rev-priority').textContent = selectedPriority;
  document.getElementById('rev-affects').textContent = affectsUsage;
  document.getElementById('rev-desc').textContent = description;
  document.getElementById('rev-has-photo').textContent = uploadedFile ? `Yes (${uploadedFile.name})` : 'No photo attached';
}

async function submitFaultReport() {
  const nextBtn = document.getElementById('wizard-next-btn');
  nextBtn.disabled = true;
  nextBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Submitting...';

  try {
    const faultType = document.getElementById('fault-type').value;
    const description = document.getElementById('fault-description').value.trim();
    const fullDescription = `[${faultType}] ${description}`;

    const formData = new FormData();
    formData.append('equipment_id', selectedEquipment.equipment_id);
    formData.append('description', fullDescription);
    formData.append('priority', selectedPriority);

    if (uploadedFile) {
      formData.append('image', uploadedFile);
    }

    const res = await api.post('/fault-reports', formData);
    if (res.success) {
      api.showToast('Fault report submitted successfully!', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    }
  } catch (err) {
    api.showToast(err.message || 'Failed to submit fault report', 'error');
    nextBtn.disabled = false;
    nextBtn.innerHTML = '<i class="bi bi-send-fill"></i> Submit Report';
  }
}
