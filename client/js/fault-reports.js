
let currentPage = 1;
const pageLimit = 20;
let totalReports = 0;
let totalPages = 0;
let allReportsCache = [];
let currentDetailReport = null;
let searchDebounceTimer = null;

async function initFaultReports() {
  const user = auth.getUser();
  if (!user) return;

  if (user.role === 'Student') {
    const kpiSection = document.getElementById('fault-kpis');
    if (kpiSection) kpiSection.style.display = 'none';
  }

  setupFilterListeners();
  setupDetailPanel();
  await loadFaultReports();
}

async function loadFaultReports() {
  const tableBody = document.getElementById('reports-table-body');
  tableBody.innerHTML = `
    <tr>
      <td colspan="7" style="text-align: center; padding: 40px; color: var(--color-neutral);">
        <i class="bi bi-arrow-clockwise" style="font-size: 24px; display: block; margin-bottom: 8px; animation: spin 1s linear infinite;"></i>
        Loading fault reports...
      </td>
    </tr>
  `;

  const params = {
    page: currentPage,
    limit: pageLimit,
  };

  const statusFilter = document.getElementById('filter-status')?.value;
  const priorityFilter = document.getElementById('filter-priority')?.value;
  const searchFilter = document.getElementById('filter-search')?.value?.trim();

  if (statusFilter) params.status = statusFilter;
  if (priorityFilter) params.priority = priorityFilter;
  if (searchFilter) params.search = searchFilter;

  try {
    const res = await api.get('/fault-reports', params);

    if (res.success && res.data) {
      totalReports = res.data.total || 0;
      totalPages = res.data.totalPages || 1;
      allReportsCache = res.data.reports || [];

      renderReportsTable(allReportsCache);
      renderPagination();
      await loadKpis();
    }
  } catch (err) {
    console.error('Failed to load fault reports:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--color-danger);">
          <i class="bi bi-exclamation-triangle" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
          Failed to load fault reports. Please try again.
        </td>
      </tr>
    `;
  }
}

async function loadKpis() {
  const user = auth.getUser();
  if (!user || user.role === 'Student') return;

  try {

    const [allRes, pendingRes, inProgressRes, resolvedRes] = await Promise.all([
      api.get('/fault-reports', { limit: 1 }),
      api.get('/fault-reports', { status: 'Pending', limit: 1 }),
      api.get('/fault-reports', { status: 'In-Progress', limit: 1 }),
      api.get('/fault-reports', { status: 'Resolved', limit: 1 }),
    ]);

    document.getElementById('kpi-total-reports').textContent = allRes.data?.total || '0';
    document.getElementById('kpi-pending').textContent = pendingRes.data?.total || '0';
    document.getElementById('kpi-in-progress').textContent = inProgressRes.data?.total || '0';
    document.getElementById('kpi-resolved').textContent = resolvedRes.data?.total || '0';
  } catch (err) {
    console.error('Failed to load KPIs:', err);
  }
}

function renderReportsTable(reports) {
  const tableBody = document.getElementById('reports-table-body');
  const countEl = document.getElementById('reports-count');

  if (countEl) {
    countEl.textContent = `(${totalReports} total)`;
  }

  if (!reports || reports.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 50px; color: var(--color-neutral);">
          <i class="bi bi-inbox" style="font-size: 36px; display: block; margin-bottom: 10px; color: var(--color-border);"></i>
          <div style="font-weight: 600; margin-bottom: 4px;">No fault reports found</div>
          <div style="font-size: 12px;">Try adjusting the filters or submit a new report.</div>
        </td>
      </tr>
    `;
    return;
  }

  const user = auth.getUser();
  const isStaff = user && user.role !== 'Student';

  const html = reports.map(report => {
    const priorityClass = getPriorityClass(report.priority);
    const statusClass = getStatusClass(report.status);
    const dateStr = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const equipName = report.equipment?.name || 'Unknown Equipment';
    const equipSerial = report.equipment?.serial_number || '';
    const reporterName = report.reporter?.name || 'Unknown';

    return `
      <tr class="report-row-clickable" data-report-id="${report.report_id}" onclick="openFaultDetail(${report.report_id})">
        <td>
          <span style="font-weight: 700; color: var(--color-primary); font-size: 13px;">#${report.report_id}</span>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--color-text-dark); font-size: 13px;">${equipName}</div>
          <div style="font-size: 11px; color: var(--color-neutral);">${equipSerial}</div>
        </td>
        <td>
          <span style="font-size: 13px;">${reporterName}</span>
        </td>
        <td>
          <span class="badge-pill ${priorityClass}">${report.priority}</span>
        </td>
        <td>
          <span class="badge-pill ${statusClass}">${report.status}</span>
        </td>
        <td>
          <span style="font-size: 13px; color: var(--color-neutral);">${dateStr}</span>
        </td>
        <td>
          <button class="btn-outline-custom" style="padding: 5px 10px; font-size: 12px;" onclick="event.stopPropagation(); openFaultDetail(${report.report_id});">
            <i class="bi bi-eye"></i> View
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = html;
}

function getPriorityClass(priority) {
  switch (priority) {
    case 'Low': return 'status-low';
    case 'Medium': return 'status-medium';
    case 'High': return 'status-high';
    case 'Critical': return 'status-critical';
    default: return 'status-neutral';
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'Pending': return 'status-pending';
    case 'In-Progress': return 'status-in-progress';
    case 'Resolved': return 'status-resolved';
    case 'Scrapped': return 'status-scrapped';
    default: return 'status-neutral';
  }
}

function renderPagination() {
  const infoEl = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  if (infoEl) {
    const start = totalReports > 0 ? (currentPage - 1) * pageLimit + 1 : 0;
    const end = Math.min(currentPage * pageLimit, totalReports);
    infoEl.textContent = `Showing ${start}–${end} of ${totalReports} reports`;
  }

  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; loadFaultReports(); } };
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; loadFaultReports(); } };
  }
}

function setupFilterListeners() {
  const statusFilter = document.getElementById('filter-status');
  const priorityFilter = document.getElementById('filter-priority');
  const searchInput = document.getElementById('filter-search');

  if (statusFilter) {
    statusFilter.addEventListener('change', () => { currentPage = 1; loadFaultReports(); });
  }

  if (priorityFilter) {
    priorityFilter.addEventListener('change', () => { currentPage = 1; loadFaultReports(); });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => { currentPage = 1; loadFaultReports(); }, 350);
    });
  }
}

function setupDetailPanel() {
  const backdrop = document.getElementById('fault-detail-backdrop');
  const closeBtn = document.getElementById('close-detail-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeFaultDetail);
  }

  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeFaultDetail();
    });
  }

  const cancelResolveBtn = document.getElementById('cancel-resolve-btn');
  if (cancelResolveBtn) {
    cancelResolveBtn.addEventListener('click', () => {
      document.getElementById('resolve-form-section').style.display = 'none';
    });
  }

  const submitResolveBtn = document.getElementById('submit-resolve-btn');
  if (submitResolveBtn) {
    submitResolveBtn.addEventListener('click', submitResolutionLog);
  }
}

async function openFaultDetail(reportId) {
  const backdrop = document.getElementById('fault-detail-backdrop');
  backdrop.classList.add('open');

  const detailBody = document.getElementById('detail-body');
  const footer = document.getElementById('detail-footer');

  document.getElementById('detail-title').textContent = `Fault Report #${reportId}`;

  try {
    const res = await api.get(`/fault-reports/${reportId}`);

    if (res.success && res.data) {
      currentDetailReport = res.data;
      renderDetailPanel(res.data);
    }
  } catch (err) {
    console.error('Failed to load fault detail:', err);
    api.showToast('Failed to load fault report details', 'error');
  }
}

function closeFaultDetail() {
  const backdrop = document.getElementById('fault-detail-backdrop');
  backdrop.classList.remove('open');
  currentDetailReport = null;

  document.getElementById('resolve-form-section').style.display = 'none';
  document.getElementById('resolve-action').value = '';
  document.getElementById('resolve-parts').value = '';
  document.getElementById('resolve-cost').value = '0';
}

function renderDetailPanel(report) {
  const user = auth.getUser();
  const isStaff = user && user.role !== 'Student';

  renderStatusPipeline(report.status);

  document.getElementById('detail-equip-name').textContent = report.equipment?.name || 'Unknown Equipment';
  document.getElementById('detail-equip-serial').textContent = report.equipment?.serial_number || '—';
  document.getElementById('detail-equip-location').textContent = report.equipment?.location || 'Unknown';

  document.getElementById('detail-reporter').textContent = report.reporter?.name || 'Unknown';
  document.getElementById('detail-reporter-role').textContent = report.reporter?.role || '—';
  document.getElementById('detail-priority').innerHTML = `<span class="badge-pill ${getPriorityClass(report.priority)}">${report.priority}</span>`;
  document.getElementById('detail-date').textContent = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const resolvedContainer = document.getElementById('detail-resolved-at-container');
  if (report.resolved_at) {
    resolvedContainer.style.display = 'flex';
    document.getElementById('detail-resolved-at').textContent = new Date(report.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } else {
    resolvedContainer.style.display = 'none';
  }

  document.getElementById('detail-description').textContent = report.description || 'No description provided.';

  const photoSection = document.getElementById('detail-photo-section');
  if (report.image_path) {
    photoSection.style.display = 'block';
    const imgUrl = `${window.location.origin}${report.image_path}`;
    document.getElementById('detail-photo').src = imgUrl;
  } else {
    photoSection.style.display = 'none';
  }

  const logsSection = document.getElementById('detail-logs-section');
  const logsList = document.getElementById('detail-logs-list');

  if (report.maintenanceLogs && report.maintenanceLogs.length > 0) {
    logsSection.style.display = 'block';
    logsList.innerHTML = report.maintenanceLogs.map(log => {
      const logDate = new Date(log.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `
        <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 600; font-size: 13px; color: var(--color-text-dark);">${log.technician?.name || 'Technician'}</span>
            <span style="font-size: 11px; color: var(--color-neutral);">${logDate}</span>
          </div>
          <div style="font-size: 13px; color: var(--color-text-dark); margin-bottom: 4px;">${log.action_taken}</div>
          ${log.parts_used ? `<div style="font-size: 12px; color: var(--color-neutral);"><i class="bi bi-gear"></i> Parts: ${log.parts_used}</div>` : ''}
          ${log.cost > 0 ? `<div style="font-size: 12px; color: var(--color-neutral);"><i class="bi bi-cash"></i> Cost: ₦${parseFloat(log.cost).toFixed(2)}</div>` : ''}
        </div>
      `;
    }).join('');
  } else {
    logsSection.style.display = 'none';
  }

  const footer = document.getElementById('detail-footer');
  if (isStaff) {
    footer.style.display = 'flex';
    renderFooterActions(report);
  } else {
    footer.style.display = 'none';
  }
}

function renderStatusPipeline(status) {
  const pipeline = document.getElementById('detail-pipeline');

  const steps = [
    { label: 'Pending', key: 'Pending' },
    { label: 'In-Progress', key: 'In-Progress' },
    { label: 'Resolved', key: 'Resolved' },
  ];

  const statusOrder = { 'Pending': 0, 'In-Progress': 1, 'Resolved': 2, 'Scrapped': -1 };
  const currentIdx = statusOrder[status] ?? -1;

  if (status === 'Scrapped') {
    pipeline.innerHTML = `
      <div class="pipeline-step" style="color: var(--color-neutral);">
        <div class="step-dot" style="background-color: var(--color-neutral); border-color: var(--color-neutral); color: white;">✕</div>
        <span>Scrapped</span>
      </div>
    `;
    return;
  }

  let html = '';
  steps.forEach((step, idx) => {
    let stepClass = '';
    if (idx < currentIdx) stepClass = 'completed';
    else if (idx === currentIdx) stepClass = 'active';

    html += `<div class="pipeline-step ${stepClass}"><div class="step-dot"></div><span>${step.label}</span></div>`;

    if (idx < steps.length - 1) {
      const connClass = idx < currentIdx ? 'completed' : '';
      html += `<div class="pipeline-connector ${connClass}"></div>`;
    }
  });

  pipeline.innerHTML = html;
}

function renderFooterActions(report) {
  const footer = document.getElementById('detail-footer');

  let buttons = '';

  if (report.status === 'Pending') {
    buttons += `
      <button class="btn-warning-custom" onclick="updateFaultStatus(${report.report_id}, 'In-Progress')">
        <i class="bi bi-arrow-right-circle"></i> Mark In-Progress
      </button>
      <button class="btn-success-custom" onclick="showResolveForm()">
        <i class="bi bi-check-circle"></i> Resolve with Log
      </button>
      <button class="btn-outline-custom" style="padding: 9px 14px; font-size: 13px; color: var(--color-neutral);" onclick="updateFaultStatus(${report.report_id}, 'Scrapped')">
        <i class="bi bi-trash"></i> Scrap
      </button>
    `;
  } else if (report.status === 'In-Progress') {
    buttons += `
      <button class="btn-success-custom" onclick="showResolveForm()">
        <i class="bi bi-check-circle"></i> Resolve with Maintenance Log
      </button>
      <button class="btn-outline-custom" style="padding: 9px 14px; font-size: 13px; color: var(--color-neutral);" onclick="updateFaultStatus(${report.report_id}, 'Scrapped')">
        <i class="bi bi-trash"></i> Scrap
      </button>
    `;
  } else if (report.status === 'Resolved') {
    buttons += `
      <span style="font-size: 13px; color: var(--color-success); font-weight: 600; display: flex; align-items: center; gap: 6px;">
        <i class="bi bi-check-circle-fill"></i> This fault has been resolved
      </span>
    `;
  } else if (report.status === 'Scrapped') {
    buttons += `
      <span style="font-size: 13px; color: var(--color-neutral); font-weight: 600; display: flex; align-items: center; gap: 6px;">
        <i class="bi bi-x-circle-fill"></i> This equipment has been scrapped
      </span>
    `;
  }

  footer.innerHTML = buttons;
}

async function updateFaultStatus(reportId, newStatus) {
  const confirmMsg = newStatus === 'Scrapped'
    ? 'Are you sure you want to scrap this equipment? This action will mark the equipment as decommissioned.'
    : `Update this fault report status to "${newStatus}"?`;

  if (!confirm(confirmMsg)) return;

  try {
    const res = await api.patch(`/fault-reports/${reportId}/status`, { status: newStatus });

    if (res.success) {
      const equipId = res.data?.equipment_id || (currentDetailReport ? currentDetailReport.equipment_id : '');
      api.showToast(`Report status updated to ${newStatus}! Redirecting to log maintenance...`, 'success');
      closeFaultDetail();

      if (newStatus === 'Resolved' || newStatus === 'Scrapped') {
        setTimeout(() => {
          window.location.href = `maintenance.html?equipment_id=${equipId}&fault_report_id=${reportId}&status=${newStatus}`;
        }, 600);
      } else {
        await loadFaultReports();
      }
    }
  } catch (err) {
    api.showToast(err.message || 'Failed to update status', 'error');
  }
}

function showResolveForm() {
  const resolveSection = document.getElementById('resolve-form-section');
  resolveSection.style.display = 'block';
  resolveSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('resolve-action').focus();
}

async function submitResolutionLog() {
  if (!currentDetailReport) return;

  const actionTaken = document.getElementById('resolve-action').value.trim();
  const partsUsed = document.getElementById('resolve-parts').value.trim();
  const cost = document.getElementById('resolve-cost').value || 0;

  if (!actionTaken) {
    api.showToast('Please describe the action taken / repairs performed.', 'warning');
    document.getElementById('resolve-action').focus();
    return;
  }

  const submitBtn = document.getElementById('submit-resolve-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Submitting...';

  try {
    const res = await api.post('/maintenance-logs', {
      equipment_id: currentDetailReport.equipment_id,
      fault_report_id: currentDetailReport.report_id,
      action_taken: actionTaken,
      parts_used: partsUsed || null,
      cost: parseFloat(cost) || 0,
      resolve_fault: true,
    });

    if (res.success) {
      api.showToast('Fault resolved and maintenance log recorded!', 'success');
      closeFaultDetail();
      await loadFaultReports();
    }
  } catch (err) {
    api.showToast(err.message || 'Failed to submit maintenance log', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Submit & Resolve';
  }
}
