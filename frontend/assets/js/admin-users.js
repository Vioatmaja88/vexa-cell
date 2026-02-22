const UserManagement = {
  state: {
    users: [],
    filters: { search: '', status: '' },
    pagination: { page: 1, limit: 20, total: 0 }
  },

  init() {
    this.setupEventListeners();
    this.loadUsers();
  },

  setupEventListeners() {
    // Search with debounce
    document.getElementById('userSearch')?.addEventListener('input',
      Utils.debounce((e) => {
        this.state.filters.search = e.target.value;
        this.state.pagination.page = 1;
        this.loadUsers();
      }, 500)
    );

    // Status filter
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
      this.state.filters.status = e.target.value;
      this.state.pagination.page = 1;
      this.loadUsers();
    });

    // Pagination
    document.getElementById('prevPage')?.addEventListener('click', () => {
      if (this.state.pagination.page > 1) {
        this.state.pagination.page--;
        this.loadUsers();
      }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
      const maxPage = Math.ceil(this.state.pagination.total / this.state.pagination.limit);
      if (this.state.pagination.page < maxPage) {
        this.state.pagination.page++;
        this.loadUsers();
      }
    });
  },

  async loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    // Show loading
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8">
          <div class="flex items-center justify-center">
            <div class="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        </td>
      </tr>
    `;

    try {
      const params = new URLSearchParams({
        page: this.state.pagination.page,
        limit: this.state.pagination.limit,
        ...(this.state.filters.search && { search: this.state.filters.search }),
        ...(this.state.filters.status && { status: this.state.filters.status })
      });

      const data = await App.request(`/admin/users?${params}`);
      this.state.users = data.data.users;
      this.state.pagination.total = data.data.pagination.total;

      this.renderTable(tbody);
      
      // Update pagination info
      const start = (this.state.pagination.page - 1) * this.state.pagination.limit + 1;
      const end = Math.min(start + this.state.pagination.limit - 1, this.state.pagination.total);
      paginationInfo.textContent = `Menampilkan ${start}-${end} dari ${this.state.pagination.total} user`;

      // Update buttons
      prevBtn.disabled = this.state.pagination.page <= 1;
      nextBtn.disabled = end >= this.state.pagination.total;

    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-8 text-center text-red-500">
            <i data-lucide="alert-circle" class="w-6 h-6 mx-auto mb-2"></i>
            <p>Gagal memuat data user</p>
          </td>
        </tr>
      `;
      lucide.createIcons();
    }
  },

  renderTable(tbody) {
    if (this.state.users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-8 text-center text-gray-500">
            <i data-lucide="users" class="w-8 h-8 mx-auto mb-2 text-gray-300"></i>
            <p>Tidak ada user ditemukan</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.state.users.map(user => `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-6 py-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium">
              ${(user.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
            </div>
            <span class="font-medium text-navy-900">${user.full_name || '-'}</span>
          </div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-600">${user.email}</td>
        <td class="px-6 py-4 text-sm text-gray-600">${user.phone || '-'}</td>
        <td class="px-6 py-4">
          <span class="text-sm font-medium text-navy-900">0</span>
          <span class="text-xs text-gray-500"> transaksi</span>
        </td>
        <td class="px-6 py-4">
          <span class="status-badge ${user.is_active ? 'success' : 'failed'}">
            ${user.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>
        <td class="px-6 py-4 text-sm text-gray-600">
          ${new Date(user.created_at).toLocaleDateString('id-ID')}
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end space-x-2">
            <button onclick="UserManagement.viewDetail('${user.id}')" 
                    class="p-2 text-gray-400 hover:text-primary-600 transition-colors">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            <button onclick="UserManagement.toggleStatus('${user.id}', ${user.is_active})" 
                    class="p-2 text-gray-400 hover:text-${user.is_active ? 'red' : 'green'}-600 transition-colors">
              <i data-lucide="${user.is_active ? 'user-x' : 'user-check'}" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    lucide.createIcons();
  },

  async viewDetail(userId) {
    const user = this.state.users.find(u => u.id === userId);
    if (!user) return;

    const modal = document.getElementById('userModal');
    modal.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-content">
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="font-bold text-lg">Detail User</h3>
              <button onclick="App.hideModal()" class="p-2 text-gray-400 hover:text-gray-600">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>

            <div class="flex items-center space-x-4 mb-6">
              <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xl">
                ${(user.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </div>
              <div>
                <p class="font-semibold text-navy-900">${user.full_name || 'User'}</p>
                <span class="status-badge ${user.is_active ? 'success' : 'failed'}">
                  ${user.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            </div>

            <div class="space-y-4 mb-6">
              <div>
                <p class="text-xs text-gray-500 mb-1">Email</p>
                <p class="font-medium">${user.email}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Phone</p>
                <p class="font-medium">${user.phone || '-'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Bergabung</p>
                <p class="font-medium">${new Date(user.created_at).toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Role</p>
                <p class="font-medium">${user.is_admin ? 'Admin' : 'User'}</p>
              </div>
            </div>

            <div class="space-y-3">
              <button onclick="UserManagement.toggleStatus('${user.id}', ${user.is_active}); App.hideModal();" 
                      class="w-full py-3 ${user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-xl font-medium transition-all">
                ${user.is_active ? 'Nonaktifkan User' : 'Aktifkan User'}
              </button>
              <button onclick="App.hideModal()" 
                      class="w-full py-3 bg-gray-100 hover:bg-gray-200 text-navy-700 rounded-xl font-medium transition-all">
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    lucide.createIcons();
  },

  async toggleStatus(userId, currentStatus) {
    if (!confirm(`Yakin ingin ${currentStatus ? 'nonaktifkan' : 'aktifkan'} user ini?`)) return;

    try {
      App.showLoading(true);
      // Note: Implement this endpoint in backend
      // await App.request(`/admin/users/${userId}/status`, {
      //   method: 'PATCH',
      //   body: JSON.stringify({ is_active: !currentStatus })
      // });

      Utils.showToast('success', 'Berhasil', `User berhasil ${currentStatus ? 'dinonaktifkan' : 'diaktifkan'}`);
      this.loadUsers();
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal mengubah status user');
    } finally {
      App.showLoading(false);
    }
  },

  async deleteUser(userId) {
    if (!confirm('Yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan.')) return;

    try {
      App.showLoading(true);
      await App.request(`/admin/users/${userId}`, { method: 'DELETE' });
      Utils.showToast('success', 'Berhasil', 'User dihapus');
      this.loadUsers();
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal menghapus user');
    } finally {
      App.showLoading(false);
    }
  },

  refresh() {
    this.state.pagination.page = 1;
    this.loadUsers();
    Utils.showToast('success', 'Refresh', 'Data diperbarui');
  }
};

window.UserManagement = UserManagement;