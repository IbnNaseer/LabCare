
let faultChartInstance = null;
let healthChartInstance = null;

async function loadDashboard() {
  const user = auth.getUser();
  if (!user) return;

  const isStudent = user.role === 'Student';

  const studentView = document.getElementById('student-dashboard-view');
  const staffView = document.getElementById('staff-dashboard-view');

  if (isStudent) {
    if (studentView) studentView.style.display = 'block';
    if (staffView) staffView.style.display = 'none';
    await loadStudentDashboard(user);
  } else {
    if (studentView) studentView.style.display = 'none';
    if (staffView) staffView.style.display = 'block';
    await loadStaffDashboard(user);
  }
}

async function loadStudentDashboard(user) {
  const greetingEl = document.getElementById('student-greeting');
  if (greetingEl) {
    greetingEl.textContent = `Hello, ${user.name.split(' ')[0]}!`;
  }

  try {
    const res = await api.get('/fault-reports');
    const reports = (res.success && res.data && res.data.reports) ? res.data.reports : [];

    const total = reports.length;
    const pending = reports.filter(r => r.status === 'Pending').length;
    const inProgress = reports.filter(r => r.status === 'In-Progress').length;
    const resolved = reports.filter(r => r.status === 'Resolved').length;

    document.getElementById('student-kpi-total').textContent = total;
    document.getElementById('student-kpi-pending').textContent = pending;
    document.getElementById('student-kpi-progress').textContent = inProgress;
    document.getElementById('student-kpi-resolved').textContent = resolved;

    renderStudentActiveTracker(reports);
    renderStudentRecentFaults(reports.slice(0, 5));
  } catch (err) {
    console.error('Failed to load student dashboard:', err);
    api.showToast('Failed to load your fault reports overview', 'error');
  }
}

function renderStudentActiveTracker(reports) {
  const container = document.getElementById('student-tracker-container');
  if (!container) return;

  const activeReport = reports ? reports.find(r => r.status === 'Pending' || r.status === 'In-Progress') : null;

  if (!activeReport) {
    const hasResolved = reports && reports.length > 0;
    container.innerHTML = hasResolved ? `
      <div style="text-align: center; padding: 28px 16px; background: #F0FDF4; border-radius: 8px; border: 1px solid #DCFCE7;">
        <i class="bi bi-patch-check-fill" style="font-size: 38px; color: #16A34A; display: block; margin-bottom: 8px;"></i>
        <h3 style="font-size: 15px; font-weight: 700; color: #166534; margin-bottom: 4px;">All Reports Cleared &amp; Resolved!</h3>
        <p style="font-size: 12px; color: #15803D; max-width: 420px; margin: 0 auto 16px auto;">
          You currently have no pending or active equipment faults under review. All previous reports have been successfully serviced and resolved.
        </p>
        <a href="scan-qr.html" class="btn-primary-custom" style="font-size: 12px; padding: 7px 14px; display: inline-flex;">
          <i class="bi bi-qr-code-scan"></i> Scan Equipment
        </a>
      </div>
    ` : `
      <div style="text-align: center; padding: 32px 16px; background: var(--color-surface); border-radius: 8px; border: 1px dashed var(--color-border);">
        <i class="bi bi-shield-check" style="font-size: 38px; color: var(--color-primary); display: block; margin-bottom: 10px;"></i>
        <h3 style="font-size: 15px; font-weight: 700; color: var(--color-text-dark); margin-bottom: 4px;">No Active Faults</h3>
        <p style="font-size: 12px; color: var(--color-neutral); max-width: 380px; margin: 0 auto 16px auto;">
          You haven't submitted any fault reports yet. If you notice a broken PC, oscilloscope, or microscope in your lab session, let the technician team know.
        </p>
        <a href="report-fault.html" class="btn-primary-custom" style="font-size: 12px; padding: 7px 14px; display: inline-flex;">
          <i class="bi bi-flag-fill"></i> Submit First Report
        </a>
      </div>
    `;
    return;
  }
  const status = activeReport.status;
  const priorityClass = getPriorityBadgeClass(activeReport.priority);
  const equipName = activeReport.equipment?.name || 'Lab Equipment';
  const equipSerial = activeReport.equipment?.serial_number || '—';
  const equipLocation = activeReport.equipment?.location || 'Lab';
  const dateStr = new Date(activeReport.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const step1Class = 'completed';
  const step2Class = status === 'In-Progress' ? 'active' : status === 'Resolved' ? 'completed' : '';
  const step3Class = status === 'Resolved' ? 'completed active' : '';

  const conn1Class = (status === 'In-Progress' || status === 'Resolved') ? 'completed' : '';
  const conn2Class = status === 'Resolved' ? 'completed' : '';

  container.innerHTML = `
    <div class="student-tracker-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 15px; color: var(--color-text-dark);">${equipName}</strong>
            <span class="badge-pill ${priorityClass}">${activeReport.priority} Priority</span>
          </div>
          <div style="font-size: 12px; color: var(--color-neutral); margin-top: 2px;">
            SN: ${equipSerial} &bull; ${equipLocation} &bull; Report #${activeReport.report_id}
          </div>
        </div>
        <div style="font-size: 12px; color: var(--color-neutral);">${dateStr}</div>
      </div>

      <!-- Live Stepper -->
      <div class="status-pipeline" style="margin: 20px 0 16px 0;">
        <div class="pipeline-step ${step1Class}">
          <div class="step-dot"></div>
          <span>1. Submitted</span>
        </div>
        <div class="pipeline-connector ${conn1Class}"></div>
        <div class="pipeline-step ${step2Class}">
          <div class="step-dot"></div>
          <span>2. In Repair</span>
        </div>
        <div class="pipeline-connector ${conn2Class}"></div>
        <div class="pipeline-step ${step3Class}">
          <div class="step-dot"></div>
          <span>3. Resolved</span>
        </div>
      </div>

      <div style="font-size: 12px; color: var(--color-text-dark); background: var(--color-white); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--color-border); margin-bottom: 12px;">
        <strong>Issue:</strong> ${activeReport.description || 'No description recorded.'}
      </div>

      <div style="display: flex; justify-content: flex-end;">
        <a href="fault-reports.html" style="font-size: 12px; font-weight: 600; color: var(--color-primary); text-decoration: none;">
          View Full Timeline & Details &rarr;
        </a>
      </div>
    </div>
  `;
}

function renderStudentRecentFaults(reports) {
  const container = document.getElementById('student-recent-faults-list');
  if (!container) return;

  if (!reports || reports.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--color-neutral); font-size: 13px;">
        No recent fault submissions.
      </div>
    `;
    return;
  }

  const html = reports.map(r => {
    const statusClass = getStatusBadgeClass(r.status);
    const dateStr = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--color-border);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 6px; background-color: var(--color-surface); display: flex; align-items: center; justify-content: center; color: var(--color-primary); font-size: 14px;">
            <i class="bi bi-pc-display"></i>
          </div>
          <div>
            <div style="font-weight: 600; font-size: 13px; color: var(--color-text-dark);">${r.equipment?.name || 'Equipment'}</div>
            <div style="font-size: 11px; color: var(--color-neutral); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.description}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge-pill ${statusClass}" style="font-size: 11px;">${r.status}</span>
          <span style="font-size: 11px; color: var(--color-neutral);">${dateStr}</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

async function loadStaffDashboard(user) {
  const greetingEl = document.getElementById('staff-greeting');
  if (greetingEl) {
    greetingEl.textContent = `Welcome back, ${user.name.split(' ')[0]}!`;
  }

  try {
    const res = await api.get('/predictions/dashboard-summary');
    if (res.success && res.data) {
      const summaryData = res.data;
      updateStaffKpis(summaryData.kpis);
      renderHealthDonut(summaryData.healthDistribution, summaryData.kpis.averageHealth);
      renderStaffRecentFaults(summaryData.recentFaults || []);
      renderFaultsChart(summaryData.faultTrend);
    }
  } catch (err) {
    console.error('Failed to load staff dashboard data:', err);
    api.showToast('Failed to load dashboard statistics', 'error');
  }
}

function updateStaffKpis(kpis) {
  if (!kpis) return;
  document.getElementById('kpi-total-equipment').textContent = kpis.totalEquipment || '0';
  document.getElementById('kpi-active-faults').textContent = kpis.activeFaults || '0';
  document.getElementById('kpi-in-maintenance').textContent = kpis.inMaintenance || '0';
  document.getElementById('kpi-predicted-risk').textContent = kpis.predictedAtRisk || '0';
}

function renderStaffRecentFaults(reports) {
  const container = document.getElementById('recent-faults-list');
  if (!container) return;

  if (!reports || reports.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--color-neutral);">
        <i class="bi bi-check-circle" style="font-size: 32px; color: var(--color-success); margin-bottom: 8px; display: block;"></i>
        No active fault reports recorded.
      </div>
    `;
    return;
  }

  const html = reports.map(r => {
    const statusClass = getStatusBadgeClass(r.status);
    const dateStr = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--color-border);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background-color: var(--color-surface); display: flex; align-items: center; justify-content: center; color: var(--color-neutral);">
            <i class="bi bi-cpu"></i>
          </div>
          <div>
            <div style="font-weight: 600; font-size: 13px; color: var(--color-text-dark);">${r.equipment?.name || 'Equipment'}</div>
            <div style="font-size: 12px; color: var(--color-neutral); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.description}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="badge-pill ${statusClass}">${r.status}</span>
          <span style="font-size: 11px; color: var(--color-neutral);">${dateStr}</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

function renderHealthDonut(dist, averageHealth) {
  const ctx = document.getElementById('healthDonutChart');
  if (!ctx) return;

  if (healthChartInstance) {
    healthChartInstance.destroy();
  }

  const low = (dist && dist.lowRisk) || 0;
  const med = (dist && dist.mediumRisk) || 0;
  const high = (dist && dist.highRisk) || 0;
  const total = (dist && dist.total) || (low + med + high);

  const dataValues = [low, med, high];

  const lowEl = document.getElementById('legend-low-count');
  const medEl = document.getElementById('legend-med-count');
  const highEl = document.getElementById('legend-high-count');

  if (lowEl) lowEl.textContent = low;
  if (medEl) medEl.textContent = med;
  if (highEl) highEl.textContent = high;

  healthChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Low Risk (≥70%)', 'Medium Risk (40-69%)', 'High Risk (<40%)'],
      datasets: [{
        data: total > 0 ? dataValues : [1],
        backgroundColor: total > 0 ? ['#10B981', '#F59E0B', '#EF4444'] : ['#E2E8F0'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: total > 0 }
      }
    }
  });

  const centerAvgEl = document.getElementById('donut-average-health');
  if (centerAvgEl) {
    centerAvgEl.textContent = `${averageHealth || 100}%`;
  }
}

function renderFaultsChart(trend) {
  const ctx = document.getElementById('faultsLineChart');
  if (!ctx) return;

  if (faultChartInstance) {
    faultChartInstance.destroy();
  }

  const defaultDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const labels = (trend && trend.labels && trend.labels.length > 0) ? trend.labels : defaultDays;
  const pendingData = (trend && trend.pending) ? trend.pending : [0, 0, 0, 0, 0, 0, 0];
  const inProgressData = (trend && trend.inProgress) ? trend.inProgress : [0, 0, 0, 0, 0, 0, 0];
  const resolvedData = (trend && trend.resolved) ? trend.resolved : [0, 0, 0, 0, 0, 0, 0];

  faultChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'New / Pending',
          data: pendingData,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'In Progress',
          data: inProgressData,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.05)',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Resolved',
          data: resolvedData,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          tension: 0.3,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 12, usePointStyle: true }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

function getPriorityBadgeClass(priority) {
  switch (priority) {
    case 'Low': return 'status-low';
    case 'Medium': return 'status-medium';
    case 'High': return 'status-high';
    case 'Critical': return 'status-critical';
    default: return 'status-neutral';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Pending': return 'status-pending';
    case 'In-Progress': return 'status-in-progress';
    case 'Resolved': return 'status-resolved';
    case 'Scrapped': return 'status-scrapped';
    default: return 'status-neutral';
  }
}
