const ExportService = {
  downloadCSV(filename, headers, rows) {
    const escapeCell = (cell) => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map(row => row.map(escapeCell).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  async exportFaultReportsCSV() {
    try {
      api.showToast('Generating Fault Reports CSV...', 'info');
      const res = await api.get('/fault-reports', { limit: 500 });
      if (!res.success || !res.data || !res.data.reports) {
        throw new Error('Failed to fetch fault reports');
      }

      const reports = res.data.reports;
      const headers = [
        'Report ID',
        'Equipment Name',
        'Serial Number',
        'Category',
        'Location',
        'Reported By',
        'Reporter Email',
        'Priority',
        'Status',
        'Description',
        'Reported Date',
        'Resolved Date'
      ];

      const rows = reports.map(r => [
        r.report_id,
        r.equipment?.name || 'N/A',
        r.equipment?.serial_number || 'N/A',
        r.equipment?.category || 'N/A',
        r.equipment?.location || 'N/A',
        r.reporter?.name || 'N/A',
        r.reporter?.email || 'N/A',
        r.priority,
        r.status,
        r.description,
        r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A',
        r.resolved_at ? new Date(r.resolved_at).toLocaleString() : 'Pending'
      ]);

      const dateStr = new Date().toISOString().slice(0, 10);
      this.downloadCSV(`labcare_fault_reports_${dateStr}.csv`, headers, rows);
      api.showToast('Fault reports CSV downloaded successfully!', 'success');
    } catch (err) {
      console.error('Export CSV error:', err);
      api.showToast(err.message || 'Could not export fault reports', 'error');
    }
  },

  async exportEquipmentCSV() {
    try {
      api.showToast('Generating Equipment Inventory CSV...', 'info');
      const res = await api.get('/equipment', { limit: 500 });
      if (!res.success || !res.data || !res.data.equipment) {
        throw new Error('Failed to fetch equipment inventory');
      }

      const equipment = res.data.equipment;
      const headers = [
        'Equipment ID',
        'Asset Name',
        'Serial Number',
        'Category',
        'Location',
        'Operating Hours',
        'Lifespan Hours',
        'Health Index (EHI %)',
        'Risk Level',
        'Status',
        'Purchase Date'
      ];

      const rows = equipment.map(e => [
        e.equipment_id,
        e.name,
        e.serial_number,
        e.category || 'Laboratory Device',
        e.location || 'Main Laboratory',
        e.operational_hours || 0,
        e.expected_lifespan_hours || 5000,
        e.predictions?.[0]?.ehi_score !== undefined ? `${e.predictions[0].ehi_score}%` : 'N/A',
        e.predictions?.[0]?.risk_level || 'Normal',
        e.status,
        e.purchase_date || 'N/A'
      ]);

      const dateStr = new Date().toISOString().slice(0, 10);
      this.downloadCSV(`labcare_equipment_inventory_${dateStr}.csv`, headers, rows);
      api.showToast('Equipment inventory CSV downloaded successfully!', 'success');
    } catch (err) {
      console.error('Export CSV error:', err);
      api.showToast(err.message || 'Could not export equipment inventory', 'error');
    }
  },

  async exportMaintenanceCSV() {
    try {
      api.showToast('Generating Maintenance Logs CSV...', 'info');
      const res = await api.get('/maintenance', { limit: 500 });
      if (!res.success || !res.data || !res.data.logs) {
        throw new Error('Failed to fetch maintenance logs');
      }

      const logs = res.data.logs;
      const headers = [
        'Log ID',
        'Equipment Name',
        'Serial Number',
        'Maintenance Type',
        'Technician / Engineer',
        'Service Date',
        'Next Scheduled Service',
        'Cost (NGN)',
        'Notes / Action Taken'
      ];

      const rows = logs.map(l => [
        l.log_id,
        l.equipment?.name || 'N/A',
        l.equipment?.serial_number || 'N/A',
        l.maintenance_type,
        l.technician?.name || 'Staff',
        l.service_date || 'N/A',
        l.next_scheduled_date || 'N/A',
        l.cost ? `₦${Number(l.cost).toLocaleString()}` : '₦0.00',
        l.notes || l.description || 'N/A'
      ]);

      const dateStr = new Date().toISOString().slice(0, 10);
      this.downloadCSV(`labcare_maintenance_logs_${dateStr}.csv`, headers, rows);
      api.showToast('Maintenance logs CSV downloaded successfully!', 'success');
    } catch (err) {
      console.error('Export CSV error:', err);
      api.showToast(err.message || 'Could not export maintenance logs', 'error');
    }
  }
};
