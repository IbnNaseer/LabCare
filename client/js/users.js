
let currentPage = 1;
const pageLimit = 20;
let totalUsers = 0;
let totalPages = 0;
let usersCache = [];
let searchDebounceTimer = null;

async function initUsersManagement() {
  setupModals();
  setupFilterListeners();
  setupForms();
  setupPasswordToggles();
  await loadUsers();
}

async function loadUsers() {
  const tableBody = document.getElementById('users-table-body');
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; padding: 40px; color: var(--color-neutral);">
        <i class="bi bi-arrow-clockwise" style="font-size: 24px; display: block; margin-bottom: 8px; animation: spin 1s linear infinite;"></i>
        Loading user accounts...
      </td>
    </tr>
  `;

  const params = {
    page: currentPage,
    limit: pageLimit,
  };

  const roleFilter = document.getElementById('filter-role')?.value;
  const searchFilter = document.getElementById('filter-search')?.value?.trim();

  if (roleFilter) params.role = roleFilter;
  if (searchFilter) params.search = searchFilter;

  try {
    const res = await api.get('/users', params);

    if (res.success && res.data) {
      totalUsers = res.data.total || 0;
      totalPages = res.data.totalPages || 1;
      usersCache = res.data.users || [];

      renderUsersTable(usersCache);
      renderPagination();
      updateKpis(res.data.stats);
    }
  } catch (err) {
    console.error('Failed to load users:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--color-danger);">
          <i class="bi bi-exclamation-triangle" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
          Failed to load user accounts.
        </td>
      </tr>
    `;
  }
}

function updateKpis(stats) {
  if (!stats) return;
  document.getElementById('kpi-total-users').textContent = stats.total || '0';
  document.getElementById('kpi-students').textContent = stats.students || '0';
  document.getElementById('kpi-technologists').textContent = stats.technologists || '0';
  document.getElementById('kpi-engineers').textContent = stats.engineers || '0';
  document.getElementById('kpi-admins').textContent = stats.admins || '0';
}

function renderUsersTable(users) {
  const tableBody = document.getElementById('users-table-body');
  const countEl = document.getElementById('users-count');

  if (countEl) {
    countEl.textContent = `(${totalUsers} accounts)`;
  }

  if (!users || users.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 50px; color: var(--color-neutral);">
          <i class="bi bi-person-x" style="font-size: 36px; display: block; margin-bottom: 10px; color: var(--color-border);"></i>
          <div style="font-weight: 600; margin-bottom: 4px;">No users found</div>
          <div style="font-size: 12px;">Try adjusting your search criteria or add a new user.</div>
        </td>
      </tr>
    `;
    return;
  }

  const currentUser = auth.getUser() || {};

  const html = users.map(user => {
    const initials = user.name
      ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : 'U';
    const roleBadgeClass = getRoleBadgeClass(user.role);
    const dateStr = user.created_at
      ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';
    const isSelf = currentUser.user_id === user.user_id;

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="user-avatar" style="width: 34px; height: 34px; font-size: 12px;">${initials}</div>
            <div>
              <div style="font-weight: 600; color: var(--color-text-dark);">${user.name} ${isSelf ? '<span style="font-size: 11px; color: var(--color-primary); font-weight: 500;">(You)</span>' : ''}</div>
              <div style="font-size: 11px; color: var(--color-neutral);">ID: #${user.user_id}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-size: 13px; color: var(--color-text-dark);">${user.email}</span>
        </td>
        <td>
          <span class="badge-pill ${roleBadgeClass}">${user.role}</span>
        </td>
        <td>
          <span style="font-size: 13px; color: var(--color-neutral);">${dateStr}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button class="btn-outline-custom" style="padding: 5px 9px; font-size: 12px;" onclick="openEditModal(${user.user_id})" title="Edit user">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn-outline-custom" style="padding: 5px 9px; font-size: 12px;" onclick="openResetPasswordModal(${user.user_id})" title="Reset password">
              <i class="bi bi-key"></i>
            </button>
            ${!isSelf ? `
              <button class="btn-outline-custom" style="padding: 5px 9px; font-size: 12px; color: var(--color-danger);" onclick="deleteUser(${user.user_id}, '${user.name.replace(/'/g, "\\'")}')" title="Delete user">
                <i class="bi bi-trash"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = html;
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'Admin': return 'status-high';
    case 'Engineer': return 'status-good';
    case 'Technologist': return 'status-medium';
    case 'Student': return 'status-active';
    default: return 'status-neutral';
  }
}

/* ========== PAGINATION ========== */

function renderPagination() {
  const infoEl = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  if (infoEl) {
    const start = totalUsers > 0 ? (currentPage - 1) * pageLimit + 1 : 0;
    const end = Math.min(currentPage * pageLimit, totalUsers);
    infoEl.textContent = `Showing ${start}–${end} of ${totalUsers} accounts`;
  }

  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; loadUsers(); } };
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; loadUsers(); } };
  }
}

/* ========== FILTERS ========== */

function setupFilterListeners() {
  const roleFilter = document.getElementById('filter-role');
  const searchInput = document.getElementById('filter-search');

  if (roleFilter) {
    roleFilter.addEventListener('change', () => { currentPage = 1; loadUsers(); });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => { currentPage = 1; loadUsers(); }, 350);
    });
  }
}

/* ========== MODAL CONTROLS ========== */

function setupModals() {
  // Open Add Modal
  const openAddBtn = document.getElementById('open-add-user-modal-btn');
  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => openModal('add-user-modal'));
  }

  // Close buttons (X or Cancel)
  document.querySelectorAll('[data-modal]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el || el.classList.contains('modal-close-btn') || el.tagName === 'BUTTON') {
        const modalId = el.getAttribute('data-modal');
        closeModal(modalId);
      }
    });
  });

  // Close when clicking backdrop
  document.querySelectorAll('.modal-backdrop-custom').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('show');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('show');
}

function setupPasswordToggles() {
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    });
  });
}

/* ========== CRUD ACTIONS ========== */

function setupForms() {
  // Add User Form
  const addForm = document.getElementById('add-user-form');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('add-user-name').value.trim();
      const email = document.getElementById('add-user-email').value.trim();
      const role = document.getElementById('add-user-role').value;
      const password = document.getElementById('add-user-password').value;

      const submitBtn = document.getElementById('add-user-submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Creating...';

      try {
        const res = await api.post('/users', { name, email, role, password });
        if (res.success) {
          api.showToast('User account created successfully!', 'success');
          closeModal('add-user-modal');
          addForm.reset();
          await loadUsers();
        }
      } catch (err) {
        api.showToast(err.message || 'Failed to create user', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Create Account';
      }
    });
  }

  // Edit User Form
  const editForm = document.getElementById('edit-user-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('edit-user-id').value;
      const name = document.getElementById('edit-user-name').value.trim();
      const email = document.getElementById('edit-user-email').value.trim();
      const role = document.getElementById('edit-user-role').value;

      const submitBtn = document.getElementById('edit-user-submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';

      try {
        const res = await api.put(`/users/${id}`, { name, email, role });
        if (res.success) {
          api.showToast('User updated successfully!', 'success');
          closeModal('edit-user-modal');
          await loadUsers();
        }
      } catch (err) {
        api.showToast(err.message || 'Failed to update user', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check2"></i> Save Changes';
      }
    });
  }

  // Reset Password Form
  const resetForm = document.getElementById('reset-password-form');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('reset-user-id').value;
      const new_password = document.getElementById('reset-new-password').value;

      const submitBtn = document.getElementById('reset-password-submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Resetting...';

      try {
        const res = await api.put(`/users/${id}/password`, { new_password });
        if (res.success) {
          api.showToast(res.message || 'Password reset successfully!', 'success');
          closeModal('reset-password-modal');
          resetForm.reset();
        }
      } catch (err) {
        api.showToast(err.message || 'Failed to reset password', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-key-fill"></i> Reset Password';
      }
    });
  }
}

function openEditModal(userId) {
  const user = usersCache.find(u => u.user_id === userId);
  if (!user) return;

  document.getElementById('edit-user-id').value = user.user_id;
  document.getElementById('edit-user-name').value = user.name;
  document.getElementById('edit-user-email').value = user.email;
  document.getElementById('edit-user-role').value = user.role;

  openModal('edit-user-modal');
}

function openResetPasswordModal(userId) {
  const user = usersCache.find(u => u.user_id === userId);
  if (!user) return;

  document.getElementById('reset-user-id').value = user.user_id;
  document.getElementById('reset-user-name-label').textContent = `${user.name} (${user.email})`;
  document.getElementById('reset-new-password').value = '';

  openModal('reset-password-modal');
}

async function deleteUser(userId, userName) {
  if (!confirm(`Are you sure you want to delete account "${userName}"? This action cannot be undone.`)) {
    return;
  }

  try {
    const res = await api.delete(`/users/${userId}`);
    if (res.success) {
      api.showToast('User account deleted successfully', 'success');
      await loadUsers();
    }
  } catch (err) {
    api.showToast(err.message || 'Failed to delete user', 'error');
  }
}
