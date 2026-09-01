async function loadAuditReport() {
  const user = auth.getUser();
  if (!user) return;

  const now = new Date();
  document.getElementById('rpt-date').textContent = now.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  document.getElementById('rpt-author').textContent = user.name;
  document.getElementById('rpt-role').textContent = user.role;
  document.getElementById('rpt-ref').textContent = `FUD/CSC/LAB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const [summaryRes, equipRes, faultsRes, maintRes] = await Promise.all([
      api.get('/predictions/dashboard-summary'),
      api.get('/equipment', { limit: 100 }),
      api.get('/fault-reports', { limit: 50 }),
      api.get('/maintenance', { limit: 50 })
    ]);

    if (summaryRes.success && summaryRes.data) {
      const kpis = summaryRes.data.kpis;
      document.getElementById('rpt-kpi-total').textContent = kpis.totalEquipment || '0';
      document.getElementById('rpt-kpi-health').textContent = `${kpis.averageHealth || 100}%`;
      document.getElementById('rpt-kpi-faults').textContent = kpis.activeFaults || '0';
      document.getElementById('rpt-kpi-maintenance').textContent = kpis.inMaintenance || '0';
    }

    if (equipRes.success && equipRes.data) {
      renderReportEquipment(equipRes.data.equipment || []);
    }

    if (faultsRes.success && faultsRes.data) {
      renderReportFaults(faultsRes.data.reports || []);
    }

    if (maintRes.success && maintRes.data) {
      renderReportMaintenance(maintRes.data.logs || []);
    }

  } catch (err) {
    console.error('Failed to load audit report data:', err);
    api.showToast('Could not load complete audit records', 'error');
  }
}

function renderReportEquipment(equipmentList) {
  const tbody = document.getElementById('rpt-equipment-table');
  if (!tbody) return;

  if (equipmentList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:14px;">No equipment records found.</td></tr>';
    return;
  }

  tbody.innerHTML = equipmentList.map(e => {
    const ehi = e.predictions?.[0]?.ehi_score !== undefined ? `${e.predictions[0].ehi_score}%` : '100%';
    const risk = e.predictions?.[0]?.risk_level || 'Normal';
    const riskColor = risk === 'High' ? 'var(--color-danger)' : risk === 'Medium' ? 'var(--color-warning)' : 'var(--color-success)';

    return `
      <tr>
        <td>#${e.equipment_id}</td>
        <td><strong>${e.name}</strong></td>
        <td><code>${e.serial_number}</code></td>
        <td>${e.category || 'Laboratory'}</td>
        <td>${e.location || 'Main Lab'}</td>
        <td>${e.operational_hours || 0} hrs</td>
        <td style="font-weight: 700;">${ehi}</td>
        <td style="color: ${riskColor}; font-weight: 700;">${risk}</td>
        <td><span class="badge-pill ${e.status === 'Active' ? 'status-active' : 'status-under-repair'}">${e.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderReportFaults(reports) {
  const tbody = document.getElementById('rpt-faults-table');
  if (!tbody) return;

  if (reports.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:14px;">No fault incidents logged.</td></tr>';
    return;
  }

  tbody.innerHTML = reports.map(r => {
    const statusClass = r.status === 'Pending' ? 'status-pending' : r.status === 'In-Progress' ? 'status-in-progress' : 'status-resolved';
    const dateStr = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <tr>
        <td>#${r.report_id}</td>
        <td><strong>${r.equipment?.name || 'Equipment'}</strong> (SN: ${r.equipment?.serial_number || '—'})</td>
        <td>${r.reporter?.name || 'User'}</td>
        <td><span class="badge-pill status-${r.priority.toLowerCase()}">${r.priority}</span></td>
        <td style="max-width: 250px;">${r.description}</td>
        <td>${dateStr}</td>
        <td><span class="badge-pill ${statusClass}">${r.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderReportMaintenance(logs) {
  const tbody = document.getElementById('rpt-maintenance-table');
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:14px;">No maintenance servicing records found.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(l => {
    const dateStr = l.service_date ? new Date(l.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    const costStr = l.cost ? `₦${Number(l.cost).toLocaleString()}` : '₦0.00';

    return `
      <tr>
        <td>#${l.log_id}</td>
        <td><strong>${l.equipment?.name || 'Equipment'}</strong> (SN: ${l.equipment?.serial_number || '—'})</td>
        <td>${l.maintenance_type}</td>
        <td>${l.technician?.name || 'Technician'}</td>
        <td>${dateStr}</td>
        <td style="font-weight: 600;">${costStr}</td>
        <td>${l.notes || l.description || 'Routine service executed'}</td>
      </tr>
    `;
  }).join('');
}
