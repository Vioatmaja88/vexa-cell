const Admin = {
  async initLogin() {
    const form = document.getElementById('adminLoginForm');
    const btn = document.getElementById('loginBtn');
    const btnLoading = document.getElementById('loginBtnLoading');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      btn.classList.add('hidden');
      btnLoading.classList.remove('hidden');
      btnLoading.classList.add('flex');

      try {
        // Regular login endpoint, then check admin flag
        const data = await App.request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        if (!data.data.user?.isAdmin) {
          throw new Error('Akses admin diperlukan');
        }

        // Store admin session
        localStorage.setItem('vexa_admin', 'true');
        Utils.showToast('success', 'Berhasil', 'Selamat datang, Admin!');
        setTimeout(() => window.location.href = '/admin/dashboard.html', 500);

      } catch (err) {
        btn.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        btnLoading.classList.remove('flex');
        form.classList.add('animate-shake');
        setTimeout(() => form.classList.remove('animate-shake'), 300);
        Utils.showToast('error', 'Error', err.message || 'Login gagal');
      }
    });

    // Toggle password
    document.getElementById('togglePassword')?.addEventListener('click', () => {
      const input = document.getElementById('password');
      const icon = document.getElementById('toggleIcon');
      input.type = input.type === 'password' ? 'text' : 'password';
      icon.setAttribute('data-lucide', input.type === 'password' ? 'eye-off' : 'eye');
      lucide.createIcons();
    });
  },

  requireAdminAuth() {
    if (!App.token || localStorage.getItem('vexa_admin') !== 'true') {
      window.location.href = '/admin/login.html';
      return false;
    }
    return true;
  },

  async loadDashboard() {
    try {
      const data = await App.request('/admin/dashboard');
      const stats = data.data.stats;

      document.getElementById('statTotalTrx').textContent = stats.totalTransactions;
      document.getElementById('statSuccess').textContent = stats.successTransactions;
      document.getElementById('statRevenue').textContent = 
        `Rp${stats.todaySales?.toLocaleString('id-ID') || '0'}`;
      document.getElementById('statUsers').textContent = stats.totalUsers;
      document.getElementById('statGrowth').textContent = 
        `${stats.successRate >= 100 ? '+' : ''}${stats.successRate}%`;

      // Color code growth
      const growthEl = document.getElementById('statGrowth');
      if (stats.successRate >= 90) {
        growthEl.className = 'text-xs text-green-600 font-medium';
      } else if (stats.successRate >= 70) {
        growthEl.className = 'text-xs text-yellow-600 font-medium';
      } else {
        growthEl.className = 'text-xs text-red-600 font-medium';
      }

    } catch (err) {
      console.error('Load dashboard error:', err);
      Utils.showToast('error', 'Error', 'Gagal memuat dashboard');
    }
  },

  async syncVouchers() {
    if (!confirm('Sync voucher dari Digiflazz? Proses ini mungkin memakan waktu.')) return;
    
    try {
      App.showLoading(true);
      const data = await App.request('/vouchers/sync', { method: 'POST' });
      Utils.showToast('success', 'Sync Berhasil', `${data.data.synced} voucher diperbarui`);
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal sync voucher');
    } finally {
      App.showLoading(false);
    }
  },

  async recalculatePrices() {
    if (!confirm('Hitung ulang semua harga berdasarkan margin terbaru?')) return;
    
    try {
      App.showLoading(true);
      const data = await App.request('/admin/prices/recalculate', { method: 'POST' });
      Utils.showToast('success', 'Berhasil', `${data.data.updated} harga diperbarui`);
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal recalculate harga');
    } finally {
      App.showLoading(false);
    }
  },

  setupMobileSidebar() {
    const btn = document.getElementById('mobileMenuBtn');
    const close = document.getElementById('mobileSidebarClose');
    const overlay = document.getElementById('mobileOverlay');
    const sidebar = document.getElementById('mobileSidebar');

    const open = () => {
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
    };
    const closeSidebar = () => {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    };

    btn?.addEventListener('click', open);
    close?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);
  }
};

// Logout handler
document.addEventListener('click', (e) => {
  if (e.target.closest('#adminLogout') || e.target.id === 'adminLogout') {
    e.preventDefault();
    localStorage.removeItem('vexa_admin');
    App.logout();
  }
});

window.Admin = Admin;