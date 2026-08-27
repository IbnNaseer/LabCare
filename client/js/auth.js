const auth = {
  getUser() {
    const userStr = localStorage.getItem('labcare_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('labcare_token');
  },

  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      localStorage.setItem('labcare_token', res.data.token);
      localStorage.setItem('labcare_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
    throw new Error(res.error || 'Login failed');
  },

  logout() {
    localStorage.removeItem('labcare_token');
    localStorage.removeItem('labcare_user');
    window.location.href = 'login.html';
  },

  requireAuth(allowedRoles = []) {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }

    if (allowedRoles.length > 0) {
      const user = this.getUser();
      if (!user || !allowedRoles.includes(user.role)) {
        alert('Access Denied: You do not have permission to access this page.');
        window.location.href = 'dashboard.html';
        return false;
      }
    }

    return true;
  }
};
