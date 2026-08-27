let currentEquipmentId = null;
let currentEquipmentData = null;
let healthMiniChart = null;

async function loadEquipmentDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  currentEquipmentId = urlParams.get('id');

  if (!currentEquipmentId) {
    window.location.href = 'equipment.html';
    return;
  }

  try {
    const res = await api.get(`/equipment/${currentEquipmentId}`);
    if (res.success && res.data) {
      currentEquipmentData = res.data.equipment;
      renderEquipmentHeader(currentEquipmentData, res.data.currentEHI);
      loadTabContent('history');
      setupEditModal();
    }
  } catch (err) {
    console.error('Failed to load equipment detail:', err);
    api.showToast('Failed to load equipment details', 'error');
  }

  setupTabs();
}

function renderEquipmentHeader(equipment, currentEHI) {
  document.getElementById('detail-name').textContent = equipment.name;
  document.getElementById('detail-serial').textContent = equipment.serial_number;
  const totalHours = parseInt(equipment.expected_lifespan_hours || 0, 10);
  const yearsEquivalent = (totalHours / 2000).toFixed(1);
  document.getElementById('detail-lifespan').textContent = `${yearsEquivalent} yrs (${totalHours.toLocaleString()} hrs)`;
  document.getElementById('detail-usage').textContent = `${parseFloat(equipment.operational_hours || 0).toFixed(1)} hrs`;
  document.getElementById('detail-purchase').textContent = equipment.purchase_date || 'N/A';
  document.getElementById('detail-qr-tag').textContent = equipment.qr_code || 'N/A';

  const statusPill = document.getElementById('detail-status-pill');
  statusPill.textContent = equipment.status;
  statusPill.className = `badge-pill ${equipment.status === 'Active' ? 'status-active' : 'status-under-repair'}`;

  // Check user role for Edit button
  const user = auth.getUser();
  const editBtn = document.getElementById('detail-edit-btn');
  if (editBtn && user && ['Admin', 'Technologist'].includes(user.role)) {
    editBtn.style.display = 'inline-flex';
  }

  // Render Mini Health Donut
  const ehiScore = currentEHI ? currentEHI.ehi : 100;
  const riskLevel = currentEHI ? currentEHI.riskLevel : 'Low';
  
  document.getElementById('mini-ehi-value').textContent = `${ehiScore}%`;
  const riskLabelEl = document.getElementById('mini-ehi-risk');
  riskLabelEl.textContent = `${riskLevel} Risk`;
  riskLabelEl.style.color = riskLevel === 'High' ? 'var(--color-danger)' : riskLevel === 'Medium' ? 'var(--color-warning)' : 'var(--color-success)';

  const ctx = document.getElementById('miniHealthDonut');
  if (ctx) {
    if (healthMiniChart) healthMiniChart.destroy();
    
    const color = riskLevel === 'High' ? '#EF4444' : riskLevel === 'Medium' ? '#F59E0B' : '#10B981';
    
    healthMiniChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [ehiScore, Math.max(0, 100 - ehiScore)],
          backgroundColor: [color, '#E2E8F0'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  }
}

function setupEditModal() {
  const modal = document.getElementById('edit-equipment-modal');
  const editBtn = document.getElementById('detail-edit-btn');
  const closeEditBtn = document.getElementById('close-edit-modal-btn');
  const editForm = document.getElementById('edit-equipment-form');
  const editCategorySelect = document.getElementById('edit-category');
  const editLifespanVal = document.getElementById('edit-lifespan-value');
  const editLifespanUnit = document.getElementById('edit-lifespan-unit');
  const editLifespanPreview = document.getElementById('edit-lifespan-preview');

  if (!modal || !editBtn) return;

  const updateEditLifespanPreview = () => {
    if (!editLifespanVal || !editLifespanUnit || !editLifespanPreview) return;
    const val = parseFloat(editLifespanVal.value) || 0;
    const unit = editLifespanUnit.value;
    const hours = unit === 'Months' ? Math.round(val * (2000 / 12)) : Math.round(val * 2000);
    editLifespanPreview.innerHTML = `&approx; <strong>${hours.toLocaleString()}</strong> operational hours`;
  };

  editBtn.onclick = () => {
    if (!currentEquipmentData) return;
    document.getElementById('edit-equipment-id').value = currentEquipmentData.equipment_id;
    document.getElementById('original-category').value = currentEquipmentData.category || 'Microscopy';
    document.getElementById('edit-name').value = currentEquipmentData.name;
    document.getElementById('edit-category').value = currentEquipmentData.category || 'Microscopy';
    document.getElementById('edit-location').value = currentEquipmentData.location || '';
    document.getElementById('edit-status').value = currentEquipmentData.status || 'Active';
    document.getElementById('edit-hours').value = parseFloat(currentEquipmentData.operational_hours || 0).toFixed(1);
    document.getElementById('edit-purchase-date').value = currentEquipmentData.purchase_date || '';
    document.getElementById('edit-serial-badge').textContent = `${currentEquipmentData.serial_number}`;

    const totalHours = parseInt(currentEquipmentData.expected_lifespan_hours || 6000, 10);
    const yearsVal = (totalHours / 2000);
    document.getElementById('edit-lifespan-value').value = Number.isInteger(yearsVal) ? yearsVal : yearsVal.toFixed(1);
    document.getElementById('edit-lifespan-unit').value = 'Years';
    updateEditLifespanPreview();

    const noticeEl = document.getElementById('category-change-notice');
    if (noticeEl) noticeEl.style.display = 'none';

    modal.style.display = 'flex';
  };

  if (closeEditBtn) {
    closeEditBtn.onclick = () => modal.style.display = 'none';
  }

  if (editCategorySelect) {
    editCategorySelect.onchange = () => {
      const orig = document.getElementById('original-category').value;
      const notice = document.getElementById('category-change-notice');
      if (notice) {
        notice.style.display = editCategorySelect.value !== orig ? 'block' : 'none';
      }
    };
  }

  if (editLifespanVal && editLifespanUnit) {
    editLifespanVal.oninput = updateEditLifespanPreview;
    editLifespanUnit.onchange = updateEditLifespanPreview;
  }

  if (editForm) {
    editForm.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-equipment-id').value;
      const name = document.getElementById('edit-name').value.trim();
      const category = document.getElementById('edit-category').value;
      const location = document.getElementById('edit-location').value.trim();
      const status = document.getElementById('edit-status').value;
      const operational_hours = document.getElementById('edit-hours').value;
      const lifespan_value = document.getElementById('edit-lifespan-value').value;
      const lifespan_unit = document.getElementById('edit-lifespan-unit').value;
      const purchase_date = document.getElementById('edit-purchase-date').value;

      try {
        const res = await api.put(`/equipment/${id}`, {
          name,
          category,
          location,
          status,
          operational_hours,
          lifespan_value,
          lifespan_unit,
          purchase_date: purchase_date || null
        });

        if (res.success) {
          api.showToast(res.message || 'Equipment updated successfully!', 'success');
          modal.style.display = 'none';
          loadEquipmentDetail();
        }
      } catch (err) {
        api.showToast(err.message || 'Failed to update equipment', 'error');
      }
    };
  }
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.borderBottom = 'none';
        b.style.color = 'var(--color-neutral)';
      });

      btn.classList.add('active');
      btn.style.borderBottom = '2px solid var(--color-primary)';
      btn.style.color = 'var(--color-primary)';

      loadTabContent(btn.dataset.tab);
    });
  });
}

async function loadTabContent(tab) {
  const container = document.getElementById('tab-content-area');
  container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--color-neutral);">Loading...</div>';

  try {
    if (tab === 'history') {
      const res = await api.get(`/equipment/${currentEquipmentId}/history`);
      if (res.success) renderTimeline(res.data.timeline || []);
    } else if (tab === 'maintenance') {
      const res = await api.get(`/maintenance-logs/equipment/${currentEquipmentId}`);
      if (res.success) renderMaintenanceTab(res.data.logs || []);
    } else if (tab === 'faults') {
      const res = await api.get('/fault-reports', { equipment_id: currentEquipmentId });
      if (res.success) renderFaultsTab(res.data.reports || []);
    } else if (tab === 'predictions') {
      const res = await api.get(`/predictions/equipment/${currentEquipmentId}`);
      if (res.success) renderPredictionsTab(res.data.history || []);
    }
  } catch (err) {
    container.innerHTML = '<div style="text-align: center; color: var(--color-danger); padding: 20px;">Failed to load tab data.</div>';
  }
}

function renderTimeline(events) {
  const container = document.getElementById('tab-content-area');
  if (!events || events.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--color-neutral);">No historical events recorded for this asset yet.</div>';
    return;
  }

  const html = events.map(ev => {
    const isFault = ev.type === 'FAULT_REPORT';
    const dateStr = new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const icon = isFault ? 'bi-flag-fill' : 'bi-wrench-adjustable-circle-fill';
    const iconColor = isFault ? 'var(--color-danger)' : 'var(--color-success)';

    return `
      <div style="display: flex; gap: 16px; margin-bottom: 20px; position: relative;">
        <div style="font-size: 20px; color: ${iconColor};"><i class="bi ${icon}"></i></div>
        <div style="flex: 1; background: var(--color-surface); padding: 14px 18px; border-radius: 8px; border: 1px solid var(--color-border);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 14px; color: var(--color-text-dark);">${ev.title}</strong>
            <span style="font-size: 12px; color: var(--color-neutral);">${dateStr}</span>
          </div>
          <p style="font-size: 13px; color: var(--color-text-dark); margin: 0 0 6px 0;">${ev.description}</p>
          <div style="font-size: 12px; color: var(--color-neutral);">By: <strong>${ev.actor}</strong> &bull; Status: <span class="badge-pill ${ev.status === 'Resolved' || ev.status === 'Completed' ? 'status-low' : 'status-medium'}">${ev.status}</span></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

function renderMaintenanceTab(logs) {
  const container = document.getElementById('tab-content-area');
  if (!logs || logs.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--color-neutral);">No service or repair logs recorded yet.</div>';
    return;
  }

  const html = `
    <table class="table-custom">
      <thead>
        <tr>
          <th>Service Date</th>
          <th>Technician</th>
          <th>Action Taken</th>
          <th>Parts Used</th>
          <th>Cost (₦)</th>
        </tr>
      </thead>
      <tbody>
        ${logs.map(l => `
          <tr>
            <td>${new Date(l.service_date).toLocaleDateString('en-US')}</td>
            <td><strong>${l.technician?.name || 'Technician'}</strong></td>
            <td>${l.action_taken || '-'}</td>
            <td>${l.parts_used || 'None'}</td>
            <td><strong>₦${parseFloat(l.cost || 0).toFixed(2)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

function renderFaultsTab(reports) {
  const container = document.getElementById('tab-content-area');
  if (!reports || reports.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--color-neutral);">No fault reports filed for this asset.</div>';
    return;
  }

  const html = `
    <table class="table-custom">
      <thead>
        <tr>
          <th>Report Date</th>
          <th>Reported By</th>
          <th>Description</th>
          <th>Priority</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${reports.map(r => `
          <tr>
            <td>${new Date(r.created_at).toLocaleDateString('en-US')}</td>
            <td><strong>${r.reporter?.name || 'User'}</strong></td>
            <td style="max-width: 300px;">${r.description}</td>
            <td><span class="badge-pill ${r.priority === 'Critical' ? 'status-critical' : r.priority === 'High' ? 'status-high' : 'status-medium'}">${r.priority}</span></td>
            <td><span class="badge-pill ${r.status === 'Resolved' ? 'status-resolved' : r.status === 'In-Progress' ? 'status-in-progress' : 'status-pending'}">${r.status}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

function renderPredictionsTab(history) {
  const container = document.getElementById('tab-content-area');
  if (!history || history.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--color-neutral);">No historical prediction snapshots found.</div>';
    return;
  }

  const html = `
    <table class="table-custom">
      <thead>
        <tr>
          <th>Computed At</th>
          <th>Health Index (EHI)</th>
          <th>Risk Level</th>
          <th>Alert Dispatched</th>
        </tr>
      </thead>
      <tbody>
        ${history.map(p => `
          <tr>
            <td>${new Date(p.computed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            <td><strong>${parseFloat(p.ehi_score).toFixed(1)}%</strong></td>
            <td><span class="badge-pill ${p.risk_level === 'High' ? 'status-high' : p.risk_level === 'Medium' ? 'status-medium' : 'status-low'}">${p.risk_level} Risk</span></td>
            <td>${p.alert_sent ? '<span style="color: var(--color-danger);"><i class="bi bi-check-circle-fill"></i> Sent</span>' : '<span style="color: var(--color-neutral);">-</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}
