function renderSidebar(activePage = '') {
  const user = auth.getUser();
  if (!user) return;

  const role = user.role || 'Student';

  // Navigation Items with Role Permissions as specified in UI_UX_SPEC §3.1
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2', href: 'dashboard.html', roles: ['Student', 'Technologist', 'Engineer', 'Admin'] },
    { id: 'scan-qr', label: 'Scan QR Code', icon: 'bi-qr-code-scan', href: 'scan-qr.html', roles: ['Student', 'Technologist', 'Engineer', 'Admin'] },
    { id: 'report-fault', label: 'Report Fault', icon: 'bi-flag', href: 'report-fault.html', roles: ['Student', 'Technologist', 'Engineer', 'Admin'] },
    { id: 'equipment', label: 'Equipment', icon: 'bi-box-seam', href: 'equipment.html', roles: ['Student', 'Technologist', 'Engineer', 'Admin'] },
    { id: 'maintenance', label: 'Maintenance', icon: 'bi-wrench-adjustable', href: 'maintenance.html', roles: ['Technologist', 'Engineer', 'Admin'] },
    { id: 'predictions', label: 'Predictions', icon: 'bi-graph-up-arrow', href: 'predictions.html', roles: ['Technologist', 'Engineer', 'Admin'] },
  ];

  const visibleNav = navItems.filter(item => item.roles.includes(role));

  const navHtml = visibleNav.map(item => `
    <li class="nav-item">
      <a href="${item.href}" class="nav-link ${activePage === item.id ? 'active' : ''}">
        <i class="bi ${item.icon}"></i>
        <span>${item.label}</span>
      </a>
    </li>
  `).join('');

  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'LC';

  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <a href="dashboard.html" class="sidebar-brand">
            <i class="bi bi-shield-plus"></i>
            <span>LabCare</span>
          </a>
        </div>
        <ul class="sidebar-menu">
          ${navHtml}
        </ul>
        <div class="sidebar-user">
          <div class="user-avatar">${initials}</div>
          <div class="user-meta">
            <div class="user-name">${user.name || 'Lab User'}</div>
            <span class="user-role">${user.role}</span>
          </div>
          <button class="logout-btn" title="Sign Out" onclick="auth.logout()">
            <i class="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </aside>
    `;
  }

  // Setup mobile toggle if present
  const toggleBtn = document.querySelector('.sidebar-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('show');
    });
  }

  // Set topbar user initials and live date
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
  }
}
