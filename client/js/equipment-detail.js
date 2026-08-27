let currentEquipmentId = null;
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
      renderEquipmentHeader(res.data.equipment, res.data.currentEHI);
      loadTabContent('history');
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
  document.getElementById('detail-category').textContent = equipment.category || 'Laboratory Equipment';
  document.getElementById('detail-location').textContent = equipment.location || 'N/A';
  document.getElementById('detail-lifespan').textContent = `${equipment.expected_lifespan_hours} hrs`;
  document.getElementById('detail-usage').textContent = `${parseFloat(equipment.operational_hours || 0).toFixed(1)} hrs`;
  document.getElementById('detail-purchase').textContent = equipment.purchase_date || 'N/A';
  document.getElementById('detail-qr-tag').textContent = equipment.qr_code || 'N/A';

  const statusPill = document.getElementById('detail-status-pill');
  statusPill.textContent = equipment.status;
  statusPill.className = `badge-pill ${equipment.status === 'Active' ? 'status-active' : 'status-under-repair'}`;

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

  // Bind report fault button
  document.getElementById('detail-report-btn').href = `report-fault.html?equipment_id=${equipment.equipment_id}`;
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTabContent(btn.dataset.tab);
    });
  });
}

async function loadTabContent(tabName) {
  const container = document.getElementById('tab-content-area');
  container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--color-neutral);">Loading tab data...</div>';

  try {
    if (tabName === 'history') {
      const res = await api.get(`/equipment/${currentEquipmentId}/history`);
      if (res.success && res.data) {
        renderHistoryTimeline(res.data.timeline || []);
      }
    } else if (tabName === 'maintenance') {
      const res = await api.get(`/maintenance-logs/equipment/${currentEquipmentId}`);
      if (res.success && res.data) {
        renderMaintenanceList(res.data);
      }
    } else if (tabName === 'faults') {
      const res = await api.get(`/fault-reports`, { equipment_id: currentEquipmentId });
      if (res.success && res.data) {
        renderFaultsList(res.data.reports || []);
      }
    } else if (tabName === 'predictions') {
      const res = await api.get(`/predictions/equipment/${currentEquipmentId}`);
      if (res.success && res.data) {
        renderPredictionsList(res.data);
      }
    }
  } catch (err) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--color-danger);">Failed to load tab information.</div>';
  }
}

function renderHistoryTimeline(timeline) {
  const container = document.getElementById('tab-content-area');
  if (!timeline || timeline.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--color-neutral);">No historical events recorded for this equipment.</div>';
    return;
  }

  const html = timeline.map(item => {
    const isMaintenance = item.type === 'Maintenance';
    const isResolved = item.type === 'FaultResolved';
    const icon = isMaintenance ? 'bi-wrench-adjustable' : isResolved ? 'bi-check2-circle' : 'bi-flag-fill';
    const iconBg = isMaintenance ? 'var(--color-warning-light)' : isResolved ? 'var(--color-success-light)' : 'var(--color-danger-light)';
    const iconColor = isMaintenance ? 'var(--color-warning)' : isResolved ? 'var(--color-success)' : 'var(--color-danger)';
    const dateStr = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `
      <div style="display: flex; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--color-border);">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: ${iconBg}; color: ${iconColor}; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
          <i class="bi ${icon}"></i>
        </div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 600; font-size: 14px; color: var(--color-text-dark);">${item.event}</span>
            <span style="font-size: 12px; color: var(--color-neutral);">${dateStr}</span>
          </div>
          <div style="font-size: 13px; color: var(--color-neutral); margin-bottom: 4px;">${item.notes || 'No description provided.'}</div>
          <div style="font-size: 12px; color: var(--color-text-muted);">Recorded by: <strong>${item.performedBy}</strong> ${item.cost ? `&bull; Cost: ₦${item.cost}` : ''}</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

function renderMaintenanceList(logs) {
  const container = document.getElementById('tab-content-area');
  if (!logs || logs.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--color-neutral);">No maintenance logs found for this asset.</div>';
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
          <th>Cost</th>
        </tr>
      </thead>
      <tbody>
        ${logs.map(log => `
          <tr>
            <td>${new Date(log.service_date).toLocaleDateString('en-US')}</td>
            <td><strong>${log.technician?.name || 'Staff'}</strong></td>
            <td>${log.action_taken || '-'}</td>
            <td>${log.parts_used || 'None'}</td>
            <td><strong>₦${parseFloat(log.cost || 0).toFixed(2)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  container.innerHTML = html;
}

function renderFaultsList(reports) {
  const container = document.getElementById('tab-content-area');
  if (!reports || reports.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--color-neutral);">No fault reports filed for this asset.</div>';
    return;
  }

  const html = `
    <table class="table-custom">
      <thead>
        <tr>
          <th>Report Date</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Description</th>
          <th>Reported By</th>
        </tr>
      </thead>
      <tbody>
        ${reports.map(r => `
          <tr>
            <td>${new Date(r.created_at).toLocaleDateString('en-US')}</td>
            <td><span class="badge-pill status-${r.priority.toLowerCase()}">${r.priority}</span></td>
            <td><span class="badge-pill status-${r.status.toLowerCase()}">${r.status}</span></td>
            <td style="max-width: 250px;">${r.description}</td>
            <td>${r.reporter?.name || 'Student'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  container.innerHTML = html;
}

function renderPredictionsList(predictions) {
  const container = document.getElementById('tab-content-area');
  if (!predictions || predictions.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--color-neutral);">No prediction history snapshots computed yet.</div>';
    return;
  }

  const html = `
    <table class="table-custom">
      <thead>
        <tr>
          <th>Computed At</th>
          <th>Health Score (EHI)</th>
          <th>Risk Level</th>
          <th>Alert Sent</th>
        </tr>
      </thead>
      <tbody>
        ${predictions.map(p => `
          <tr>
            <td>${new Date(p.computed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            <td><strong style="font-size: 14px;">${parseFloat(p.ehi_score)}%</strong></td>
            <td><span class="badge-pill status-${p.risk_level.toLowerCase()}">${p.risk_level} Risk</span></td>
            <td>${p.alert_sent ? '<span style="color: var(--color-success); font-weight: 600;"><i class="bi bi-check-circle"></i> Sent</span>' : '<span style="color: var(--color-neutral);">-</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  container.innerHTML = html;
}
