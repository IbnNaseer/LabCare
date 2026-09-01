async function loadPredictions() {
  const tableBody = document.getElementById('predictions-table-body');
  tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--color-neutral);">Loading predictive health calculations...</td></tr>';

  try {
    const res = await api.get('/equipment', { limit: 100 });
    if (res.success && res.data) {
      const items = res.data.equipment || [];
      renderPredictionsTriage(items);
    }
  } catch (err) {
    console.error('Failed to load predictions:', err);
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-danger); padding: 20px;">Failed to load predictions.</td></tr>';
  }

  const recalcBtn = document.getElementById('recalculate-ehi-btn');
  if (recalcBtn) {
    recalcBtn.addEventListener('click', async () => {
      recalcBtn.disabled = true;
      recalcBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Recalculating...';

      try {
        const res = await api.post('/predictions/recalculate', {});
        if (res.success) {
          api.showToast('EHI recalculated & high-risk alerts verified!', 'success');
          loadPredictions();
        }
      } catch (err) {
        api.showToast(err.message || 'Recalculation failed', 'error');
      } finally {
        recalcBtn.disabled = false;
        recalcBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Recalculate EHI';
      }
    });
  }
}

function renderPredictionsTriage(equipmentList) {
  const tableBody = document.getElementById('predictions-table-body');

  equipmentList.sort((a, b) => {
    const aPred = a.predictions && a.predictions[0] ? parseFloat(a.predictions[0].ehi_score) : 100;
    const bPred = b.predictions && b.predictions[0] ? parseFloat(b.predictions[0].ehi_score) : 100;
    return aPred - bPred;
  });

  if (equipmentList.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--color-neutral);">No equipment records found.</td></tr>';
    return;
  }

  const html = equipmentList.map(item => {
    const latestPred = item.predictions && item.predictions[0];
    const ehiScore = latestPred ? parseFloat(latestPred.ehi_score) : 100;
    const riskLevel = latestPred ? latestPred.risk_level : 'Low';
    const riskClass = riskLevel === 'High' ? 'status-high' : riskLevel === 'Medium' ? 'status-medium' : 'status-low';

    let forecastText = 'Normal Operation';
    if (riskLevel === 'High') {
      forecastText = '<span style="color: var(--color-danger); font-weight: 700;">Immediate (&lt; 7 days)</span>';
    } else if (riskLevel === 'Medium') {
      forecastText = '<span style="color: var(--color-warning); font-weight: 600;">Within 30-60 days</span>';
    } else {
      forecastText = '<span style="color: var(--color-success); font-weight: 500;">Routine (180+ days)</span>';
    }

    return `
      <tr>
        <td>
          <div style="font-weight: 600; color: var(--color-text-dark);">${item.name}</div>
          <div style="font-size: 12px; color: var(--color-neutral);">${item.location || 'Lab'} &bull; SN: ${item.serial_number}</div>
        </td>
        <td><span style="font-size: 13px; font-family: monospace; color: var(--color-primary);">${item.qr_code || item.serial_number}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="health-bar-container" style="width: 100px;">
              <div class="health-bar-fill ${riskLevel.toLowerCase()}" style="width: ${ehiScore}%;"></div>
            </div>
            <strong style="font-size: 13px;">${ehiScore}%</strong>
          </div>
        </td>
        <td>${forecastText}</td>
        <td><span class="badge-pill ${riskClass}">${riskLevel} Risk</span></td>
        <td style="text-align: right;">
          <a href="equipment-detail.html?id=${item.equipment_id}" class="btn-outline-custom" style="padding: 4px 10px; font-size: 12px;">
            Inspect
          </a>
        </td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = html;
}
