let equipmentList = [];
let pendingFaults = [];

async function loadMaintenance() {
  const tableBody = document.getElementById('maintenance-table-body');
  tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--color-neutral);">Loading maintenance records...</td></tr>';

  try {
    const [logsRes, equipRes, faultsRes] = await Promise.all([
      api.get('/maintenance-logs', { limit: 100 }),
      api.get('/equipment', { limit: 100 }),
      api.get('/fault-reports', { status: 'Pending' })
    ]);

    if (equipRes.success) equipmentList = equipRes.data.equipment || [];
    if (faultsRes.success) pendingFaults = faultsRes.data.reports || [];

    if (logsRes.success && logsRes.data) {
      renderMaintenanceTable(logsRes.data.logs || []);
    }

    setupMaintenanceModal();
  } catch (err) {
    console.error('Failed to load maintenance:', err);
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-danger); padding: 20px;">Failed to load maintenance records.</td></tr>';
  }
}

function renderMaintenanceTable(logs) {
  const tableBody = document.getElementById('maintenance-table-body');
  const countEl = document.getElementById('log-count');
  if (countEl) countEl.textContent = `(${logs.length} logs)`;

  if (!logs || logs.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--color-neutral);">No maintenance logs recorded yet.</td></tr>';
    return;
  }

  const html = logs.map(log => {
    const dateStr = new Date(log.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <tr>
        <td>
          <div style="font-weight: 600; color: var(--color-text-dark);">${log.equipment?.name || 'Equipment'}</div>
          <div style="font-size: 12px; color: var(--color-neutral);">SN: ${log.equipment?.serial_number || '-'} &bull; ${log.equipment?.location || 'Lab'}</div>
        </td>
        <td><span style="font-size: 13px; font-weight: 500;">${dateStr}</span></td>
        <td><strong>${log.technician?.name || 'Technician'}</strong></td>
        <td style="max-width: 250px;">${log.action_taken || '-'}</td>
        <td><span style="font-size: 13px;">${log.parts_used || 'None'}</span></td>
        <td><strong style="color: var(--color-text-dark);">₦${parseFloat(log.cost || 0).toFixed(2)}</strong></td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = html;
}

function setupMaintenanceModal() {
  const modal = document.getElementById('log-maintenance-modal');
  const openBtn = document.getElementById('open-log-modal-btn');
  const closeBtn = document.getElementById('close-log-modal-btn');
  const form = document.getElementById('maintenance-form');
  const equipSelect = document.getElementById('maint-equipment');
  const faultSelect = document.getElementById('maint-fault-report');

  equipSelect.innerHTML = '<option value="">-- Select equipment --</option>' +
    equipmentList.map(e => `<option value="${e.equipment_id}">${e.name} (${e.serial_number})</option>`).join('');

  faultSelect.innerHTML = '<option value="">-- None (Routine Maintenance) --</option>' +
    pendingFaults.map(f => `<option value="${f.report_id}">Fault #${f.report_id}: ${f.equipment?.name} - ${f.description.substring(0, 40)}...</option>`).join('');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.style.display = 'flex');
    closeBtn.addEventListener('click', () => modal.style.display = 'none');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const equipment_id = equipSelect.value;
      const fault_report_id = faultSelect.value || null;
      const action_taken = document.getElementById('maint-action').value.trim();
      const parts_used = document.getElementById('maint-parts').value.trim();
      const cost = document.getElementById('maint-cost').value || 0;
      const resolve_fault = document.getElementById('maint-resolve-check').checked;

      try {
        const res = await api.post('/maintenance-logs', {
          equipment_id,
          fault_report_id,
          action_taken,
          parts_used,
          cost,
          resolve_fault
        });

        if (res.success) {
          api.showToast('Maintenance log recorded successfully!', 'success');
          modal.style.display = 'none';
          form.reset();
          loadMaintenance();
        }
      } catch (err) {
        api.showToast(err.message || 'Failed to log maintenance', 'error');
      }
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const paramEquipId = urlParams.get('equipment_id');
  const paramFaultId = urlParams.get('fault_report_id');
  const paramAction = urlParams.get('action');
  const paramStatus = urlParams.get('status');

  if (paramEquipId && equipSelect) {
    equipSelect.value = paramEquipId;
  }
  if (paramFaultId && faultSelect) {
    faultSelect.value = paramFaultId;
  }
  if (paramAction) {
    const actionInput = document.getElementById('maint-action');
    if (actionInput) actionInput.value = decodeURIComponent(paramAction);
  } else if (paramStatus === 'Resolved') {
    const actionInput = document.getElementById('maint-action');
    if (actionInput) actionInput.value = 'Repaired components and restored to active service.';
  } else if (paramStatus === 'Scrapped') {
    const actionInput = document.getElementById('maint-action');
    if (actionInput) actionInput.value = 'Stripped for reusable parts and decommissioned.';
  }

  if (paramEquipId || paramFaultId || paramStatus) {
    if (modal) modal.style.display = 'flex';
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}
