function renderSidebar(activePage = '') {
  const user = auth.getUser();
  if (!user) return;

  const role = user.role || 'Student';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2', href: 'dashboard.html', roles: ['Student', 'Technologist', 'Engineer', 'Admin'] },
    { id: 'scan-qr', label: 'Scan QR Code', icon: 'bi-qr-code-scan', href: 'scan-qr.html', roles: ['Student', 'Technologist', 'Engineer', 'Admin'] },
    { id: 'report-fault', label: 'Report Fault', icon: 'bi-flag', href: 'report-fault.html', roles: ['Student', 'Technologist', 'Engineer', 'Admin'] },
    { id: 'fault-reports', label: 'Fault Reports', icon: 'bi-flag-fill', href: 'fault-reports.html', roles: ['Student', 'Technologist', 'Engineer', 'Admin'] },
    { id: 'equipment', label: 'Equipment', icon: 'bi-box-seam', href: 'equipment.html', roles: ['Technologist', 'Engineer', 'Admin'] },
    { id: 'maintenance', label: 'Maintenance', icon: 'bi-wrench-adjustable', href: 'maintenance.html', roles: ['Technologist', 'Engineer', 'Admin'] },
    { id: 'predictions', label: 'Predictions', icon: 'bi-graph-up-arrow', href: 'predictions.html', roles: ['Technologist', 'Engineer', 'Admin'] },
    { id: 'audit-report', label: 'Audit Reports', icon: 'bi-file-earmark-bar-graph', href: 'audit-report.html', roles: ['Technologist', 'Engineer', 'Admin'] },
    { id: 'users', label: 'User Management', icon: 'bi-people', href: 'users.html', roles: ['Admin'] },
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
        <div class="sidebar-user ${activePage === 'profile' ? 'active-profile' : ''}">
          <a href="profile.html" class="sidebar-user-profile-link" title="View Profile & Settings" style="display: flex; align-items: center; gap: 12px; flex: 1; text-decoration: none; min-width: 0; color: inherit;">
            <div class="user-avatar">${initials}</div>
            <div class="user-meta">
              <div class="user-name">${user.name || 'Lab User'}</div>
              <span class="user-role">${user.role}</span>
            </div>
          </a>
          <button class="logout-btn" title="Sign Out" onclick="auth.logout()">
            <i class="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </aside>
    `;
  }

  const toggleBtn = document.querySelector('.sidebar-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('show');
    });
  }

  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
  }
}
