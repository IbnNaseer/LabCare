let faultChartInstance = null;
let healthChartInstance = null;

async function loadDashboard() {
  const user = auth.getUser();
  if (!user) return;

  // Set greeting
  const greetingEl = document.getElementById('user-greeting');
  if (greetingEl) {
    greetingEl.textContent = `Welcome back, ${user.name.split(' ')[0]}!`;
  }

  // Hide staff-only quick actions if student
  if (user.role === 'Student') {
    document.querySelectorAll('.staff-only-action').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.staff-only-section').forEach(el => el.style.display = 'none');
  }

  try {
    let summaryData = null;
    if (user.role !== 'Student') {
      const res = await api.get('/predictions/dashboard-summary');
      if (res.success) {
        summaryData = res.data;
        updateKpis(summaryData.kpis);
        renderHealthDonut(summaryData.healthDistribution, summaryData.kpis.averageHealth);
      }
    } else {
      // Student basic KPIs
      const equipRes = await api.get('/equipment', { limit: 1 });
      const faultsRes = await api.get('/fault-reports', { limit: 1 });
      
      document.getElementById('kpi-total-equipment').textContent = equipRes.data?.total || '0';
      document.getElementById('kpi-active-faults').textContent = faultsRes.data?.total || '0';
      document.getElementById('kpi-in-maintenance').textContent = '-';
      document.getElementById('kpi-predicted-risk').textContent = '-';
    }

    // Load recent faults
    const faultsRes = await api.get('/fault-reports', { limit: 5 });
    if (faultsRes.success) {
      renderRecentFaults(faultsRes.data.reports);
      renderFaultsChart(faultsRes.data.reports);
    }
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    api.showToast('Failed to load dashboard statistics', 'error');
  }
}

function updateKpis(kpis) {
  if (!kpis) return;
  document.getElementById('kpi-total-equipment').textContent = kpis.totalEquipment || '0';
  document.getElementById('kpi-active-faults').textContent = kpis.activeFaults || '0';
  document.getElementById('kpi-in-maintenance').textContent = kpis.inMaintenance || '0';
  document.getElementById('kpi-predicted-risk').textContent = kpis.predictedAtRisk || '0';
}

function renderRecentFaults(reports) {
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
    const statusClass = r.status === 'Pending' ? 'status-pending' : r.status === 'In-Progress' ? 'status-in-progress' : 'status-resolved';
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

function renderHealthDonut(distribution, averageHealth) {
  const ctx = document.getElementById('healthDonutChart');
  if (!ctx) return;

  if (healthChartInstance) {
    healthChartInstance.destroy();
  }

  const dataValues = distribution ? [
    distribution.lowRisk || 0,
    distribution.mediumRisk || 0,
    distribution.highRisk || 0
  ] : [1, 0, 0];

  const total = dataValues.reduce((a, b) => a + b, 0);

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

function renderFaultsChart(reports) {
  const ctx = document.getElementById('faultsLineChart');
  if (!ctx) return;

  if (faultChartInstance) {
    faultChartInstance.destroy();
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const pendingData = [1, 2, 1, 3, 2, 1, 0];
  const inProgressData = [0, 1, 2, 1, 1, 0, 0];
  const resolvedData = [2, 3, 4, 2, 5, 1, 0];

  faultChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
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
