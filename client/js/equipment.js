async function loadEquipment(searchQuery = '', categoryFilter = '') {
  const user = auth.getUser();
  if (user && user.role !== 'Admin') {
    document.querySelectorAll('.admin-only-btn').forEach(el => el.style.display = 'none');
  }

  const tableBody = document.getElementById('equipment-table-body');
  if (tableBody) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--color-neutral);">Loading equipment...</td></tr>';
  }

  try {
    const params = { limit: 100 };
    if (searchQuery) params.search = searchQuery;
    if (categoryFilter) params.category = categoryFilter;

    const res = await api.get('/equipment', params);
    if (res.success && res.data) {
      renderEquipmentTable(res.data.equipment || []);
    }
  } catch (err) {
    console.error('Failed to load equipment:', err);
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--color-danger); padding: 20px;">Failed to load equipment data.</td></tr>';
    }
  }
}

function renderEquipmentTable(items) {
  const tableBody = document.getElementById('equipment-table-body');
  const countEl = document.getElementById('equipment-count');
  if (countEl) countEl.textContent = `(${items.length} assets)`;

  if (!items || items.length === 0) {
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--color-neutral);">No laboratory equipment found.</td></tr>';
    }
    return;
  }

  const html = items.map(item => {
    const latestPred = item.predictions && item.predictions[0];
    const ehiScore = latestPred ? parseFloat(latestPred.ehi_score) : 100;
    const riskLevel = latestPred ? latestPred.risk_level : 'Low';
    
    const riskClass = riskLevel === 'High' ? 'status-high' : riskLevel === 'Medium' ? 'status-medium' : 'status-low';
    const statusClass = item.status === 'Active' ? 'status-active' : item.status === 'Under Repair' ? 'status-under-repair' : 'status-scrapped';

    return `
      <tr>
        <td>
          <div style="font-weight: 600; color: var(--color-text-dark);">${item.name}</div>
          <div style="font-size: 12px; color: var(--color-neutral);">SN: ${item.serial_number}</div>
        </td>
        <td><span style="font-size: 13px;">${item.category || 'General'}</span></td>
        <td><span style="font-size: 13px;">${item.location || 'N/A'}</span></td>
        <td><span style="font-size: 13px; font-weight: 600;">${parseFloat(item.operational_hours || 0).toFixed(1)} hrs</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="health-bar-container" style="width: 80px;">
              <div class="health-bar-fill ${riskLevel.toLowerCase()}" style="width: ${ehiScore}%;"></div>
            </div>
            <span style="font-weight: 700; font-size: 12px;">${ehiScore}%</span>
          </div>
        </td>
        <td><span class="badge-pill ${statusClass}">${item.status}</span></td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <a href="equipment-detail.html?id=${item.equipment_id}" class="btn-outline-custom" style="padding: 4px 10px; font-size: 12px;">
              View Details
            </a>
            <button onclick="showQrModal('${item.equipment_id}', '${encodeURIComponent(item.name)}', '${item.serial_number}', '${item.qr_code}')" class="btn-outline-custom" style="padding: 4px 8px; font-size: 12px;" title="View QR Tag">
              <i class="bi bi-qr-code"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (tableBody) tableBody.innerHTML = html;
}

function showQrModal(id, encodedName, serial, qrCode) {
  const name = decodeURIComponent(encodedName);
  const qrImage = `../public/qrcodes/${qrCode}.png`;
  
  let modal = document.getElementById('qr-view-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'qr-view-modal';
    modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 24px; max-width: 360px; width: 90%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">${name}</h3>
      <div style="font-size: 12px; color: var(--color-neutral); margin-bottom: 16px;">Asset Tag: ${qrCode}</div>
      <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; border: 1px solid var(--color-border); margin-bottom: 16px;">
        <img src="${qrImage}" alt="QR Code" style="width: 180px; height: 180px; display: block; margin: 0 auto;" onerror="this.src='https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrCode}';">
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn-outline-custom" style="flex: 1;" onclick="document.getElementById('qr-view-modal').style.display='none'">Close</button>
        <button class="btn-primary-custom" style="flex: 1;" onclick="window.print()"><i class="bi bi-printer"></i> Print</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}

function setupEquipmentSearch() {
  const searchInput = document.getElementById('equipment-search');
  const categorySelect = document.getElementById('category-filter');

  if (searchInput && categorySelect) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadEquipment(searchInput.value.trim(), categorySelect.value);
      }, 300);
    });

    categorySelect.addEventListener('change', () => {
      loadEquipment(searchInput.value.trim(), categorySelect.value);
    });
  }

  const addModal = document.getElementById('add-equipment-modal');
  const openAddBtn = document.getElementById('open-add-modal-btn');
  const closeAddBtn = document.getElementById('close-add-modal-btn');
  const addForm = document.getElementById('add-equipment-form');

  const lifespanValueInput = document.getElementById('add-lifespan-value');
  const lifespanUnitSelect = document.getElementById('add-lifespan-unit');
  const lifespanPreview = document.getElementById('lifespan-hours-preview');

  const updateLifespanPreview = () => {
    if (!lifespanValueInput || !lifespanUnitSelect || !lifespanPreview) return;
    const val = parseFloat(lifespanValueInput.value) || 0;
    const unit = lifespanUnitSelect.value;
    const hours = unit === 'Months' ? Math.round(val * (2000 / 12)) : Math.round(val * 2000);
    lifespanPreview.innerHTML = `&approx; <strong>${hours.toLocaleString()}</strong> operational hours`;
  };

  if (lifespanValueInput && lifespanUnitSelect) {
    lifespanValueInput.addEventListener('input', updateLifespanPreview);
    lifespanUnitSelect.addEventListener('change', updateLifespanPreview);
  }

  if (openAddBtn && addModal) {
    openAddBtn.addEventListener('click', () => {
      addModal.style.display = 'flex';
      updateLifespanPreview();
    });
    closeAddBtn.addEventListener('click', () => addModal.style.display = 'none');

    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('add-name').value.trim();
      const category = document.getElementById('add-category').value;
      const location = document.getElementById('add-location').value.trim();
      const lifespan_value = document.getElementById('add-lifespan-value').value;
      const lifespan_unit = document.getElementById('add-lifespan-unit').value;
      const purchase_date = document.getElementById('add-purchase-date').value;

      try {
        const res = await api.post('/equipment', {
          name,
          category,
          location,
          lifespan_value,
          lifespan_unit,
          purchase_date: purchase_date || null
        });

        if (res.success) {
          api.showToast(`Equipment added! Serial: ${res.data.serial_number}`, 'success');
          addModal.style.display = 'none';
          addForm.reset();
          updateLifespanPreview();
          loadEquipment();
        }
      } catch (err) {
        api.showToast(err.message || 'Failed to add equipment', 'error');
      }
    });
  }
}
