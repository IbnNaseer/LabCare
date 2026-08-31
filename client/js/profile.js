/**
 * User Profile & Password Management — profile.js
 */

async function initProfile() {
  setupPasswordToggles();
  setupForms();
  await loadUserProfile();
}

async function loadUserProfile() {
  try {
    const res = await api.get('/auth/me');
    if (res.success && res.data) {
      const user = res.data;
      renderUserData(user);
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
    api.showToast('Failed to load user profile information', 'error');
  }
}

function renderUserData(user) {
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'LC';

  document.getElementById('profile-avatar').textContent = initials;
  document.getElementById('profile-name-display').textContent = user.name || 'Lab User';
  document.getElementById('profile-email-display').textContent = user.email || '';

  const roleBadge = document.getElementById('profile-role-badge');
  roleBadge.textContent = user.role;
  roleBadge.className = `badge-pill ${getRoleBadgeClass(user.role)}`;

  if (user.created_at) {
    const dateStr = new Date(user.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    document.getElementById('profile-joined-display').textContent = dateStr;
  }

  // Populate form inputs
  const nameInput = document.getElementById('profile-name-input');
  nameInput.value = user.name || '';
  document.getElementById('profile-email-input').value = user.email || '';
  document.getElementById('profile-role-input').value = user.role || '';

  // Role permissions for editing name:
  const isAdmin = user.role === 'Admin';
  const nameLockNotice = document.getElementById('name-lock-notice');
  const adminSaveContainer = document.getElementById('admin-name-save-container');

  if (isAdmin) {
    nameInput.readOnly = false;
    nameInput.style.backgroundColor = 'var(--color-white)';
    nameLockNotice.innerHTML = `
      <i class="bi bi-shield-check" style="color: var(--color-primary);"></i>
      <span>Administrator: You may edit your system display name.</span>
    `;
    adminSaveContainer.style.display = 'block';
  } else {
    nameInput.readOnly = true;
    nameInput.style.backgroundColor = 'var(--color-surface)';
    adminSaveContainer.style.display = 'none';
  }
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'Admin':
      return 'status-high';
    case 'Engineer':
      return 'status-good';
    case 'Technologist':
      return 'status-medium';
    case 'Student':
      return 'status-active';
    default:
      return 'status-neutral';
  }
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

function setupForms() {
  // Change Password Form
  const pwForm = document.getElementById('change-password-form');
  if (pwForm) {
    pwForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const current_password = document.getElementById('current-password').value;
      const new_password = document.getElementById('new-password').value;
      const confirm_password = document.getElementById('confirm-password').value;

      if (new_password !== confirm_password) {
        api.showToast('New passwords do not match. Please re-enter.', 'warning');
        document.getElementById('confirm-password').focus();
        return;
      }

      if (new_password.length < 6) {
        api.showToast('New password must be at least 6 characters long.', 'warning');
        document.getElementById('new-password').focus();
        return;
      }

      const submitBtn = document.getElementById('change-pw-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Updating...';

      try {
        const res = await api.put('/auth/change-password', {
          current_password,
          new_password,
        });

        if (res.success) {
          api.showToast('Password updated successfully!', 'success');
          pwForm.reset();
        }
      } catch (err) {
        api.showToast(err.message || 'Failed to update password', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-shield-lock"></i> Update Password';
      }
    });
  }

  // Admin Name Update Form
  const infoForm = document.getElementById('profile-info-form');
  if (infoForm) {
    infoForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('profile-name-input').value.trim();
      if (!name) {
        api.showToast('Name cannot be empty', 'warning');
        return;
      }

      const saveBtn = document.getElementById('save-name-btn');
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';

      try {
        const res = await api.put('/auth/profile', { name });
        if (res.success) {
          api.showToast('Profile name updated successfully!', 'success');
          // Update cached user in localStorage
          const cachedUser = auth.getUser() || {};
          cachedUser.name = name;
          localStorage.setItem('labcare_user', JSON.stringify(cachedUser));
          renderSidebar('profile');
          await loadUserProfile();
        }
      } catch (err) {
        api.showToast(err.message || 'Failed to update name', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check2"></i> Update Display Name';
      }
    });
  }
}
