const TransactionManagement = {
  state: {
    transactions: [],
    filters: { search: '', status: '', dateFrom: '', dateTo: '' },
    pagination: { page: 1, limit: 20, total: 0 },
    stats: { total: 0, success: 0, pending: 0, failed: 0 }
  },

  init() {
    this.setupEventListeners();
    this.loadTransactions();
  },

  setupEventListeners() {
    // Search
    document.getElementById('trxSearch')?.addEventListener('input',
      Utils.debounce((e) => {
        this.state.filters.search = e.target.value;
        this.state.pagination.page = 1;
      }, 500)
    );

    // Status filter
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
      this.state.filters.status = e.target.value;
      this.state.pagination.page = 1;
    });

    // Date filters
    document.getElementById('dateFrom')?.addEventListener('change', (e) => {
      this.state.filters.dateFrom = e.target.value;
      this.state.pagination.page = 1;
    });

    document.getElementById('dateTo')?.addEventListener('change', (e) => {
      this.state.filters.dateTo = e.target.value;
      this.state.pagination.page = 1;
    });

    // Pagination
    document.getElementById('prevPage')?.addEventListener('click', () => {
      if (this.state.pagination.page > 1) {
        this.state.pagination.page--;
        this.loadTransactions();
      }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
      const maxPage = Math.ceil(this.state.pagination.total / this.state.pagination.limit);
      if (this.state.pagination.page < maxPage) {
        this.state.pagination.page++;
        this.loadTransactions();
      }
    });
  },

  applyFilters() {
    this.state.pagination.page = 1;
    this.loadTransactions();
  },

  async loadTransactions() {
    const tbody = document.getElementById('transactionsTableBody');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-6 py-8">
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
        ...(this.state.filters.status && { status: this.state.filters.status }),
        ...(this.state.filters.dateFrom && { dateFrom: this.state.filters.dateFrom }),
        ...(this.state.filters.dateTo && { dateTo: this.state.filters.dateTo })
      });

      const data = await App.request(`/admin/transactions?${params}`);
      this.state.transactions = data.data.transactions;
      this.state.pagination.total = data.data.pagination.total;

      this.calculateStats();
      this.renderTable(tbody);
      this.renderStats();
      
      // Update pagination
      const start = (this.state.pagination.page - 1) * this.state.pagination.limit + 1;
      const end = Math.min(start + this.state.pagination.limit - 1, this.state.pagination.total);
      paginationInfo.textContent = `Menampilkan ${start}-${end} dari ${this.state.pagination.total} transaksi`;

      prevBtn.disabled = this.state.pagination.page <= 1;
      nextBtn.disabled = end >= this.state.pagination.total;

    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-8 text-center text-red-500">
            <i data-lucide="alert-circle" class="w-6 h-6 mx-auto mb-2"></i>
            <p>Gagal memuat data transaksi</p>
          </td>
        </tr>
      `;
      lucide.createIcons();
    }
  },

  calculateStats() {
    const stats = { total: 0, success: 0, pending: 0, failed: 0 };
    this.state.transactions.forEach(trx => {
      stats.total++;
      if (trx.status === 'success') stats.success++;
      else if (['pending', 'processing'].includes(trx.status)) stats.pending++;
      else if (trx.status === 'failed') stats.failed++;
    });
    this.state.stats = stats;
  },

  renderStats() {
    document.getElementById('statTotal').textContent = this.state.stats.total;
    document.getElementById('statSuccess').textContent = this.state.stats.success;
    document.getElementById('statPending').textContent = this.state.stats.pending;
    document.getElementById('statFailed').textContent = this.state.stats.failed;
  },

  renderTable(tbody) {
    if (this.state.transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-8 text-center text-gray-500">
            <i data-lucide="receipt" class="w-8 h-8 mx-auto mb-2 text-gray-300"></i>
            <p>Tidak ada transaksi ditemukan</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.state.transactions.map(trx => `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-6 py-4">
          <p class="font-mono text-xs text-navy-900">${trx.transaction_id?.slice(0, 12)}...</p>
        </td>
        <td class="px-6 py-4">
          <p class="text-sm font-medium text-navy-900">${trx.users?.full_name || 'User'}</p>
          <p class="text-xs text-gray-500">${trx.users?.email || '-'}</p>
        </td>
        <td class="px-6 py-4">
          <p class="text-sm font-medium">${trx.vouchers?.name || 'Voucher'}</p>
          <p class="text-xs text-gray-500">${trx.vouchers?.nominal || '-'}</p>
        </td>
        <td class="px-6 py-4">
          <p class="font-mono text-sm">${trx.target_number || '-'}</p>
        </td>
        <td class="px-6 py-4">
          <p class="font-semibold text-navy-900">Rp${trx.total_amount?.toLocaleString('id-ID')}</p>
        </td>
        <td class="px-6 py-4">
          <span class="status-badge ${trx.status}">${this.formatStatus(trx.status)}</span>
        </td>
        <td class="px-6 py-4 text-sm text-gray-600">
          ${new Date(trx.created_at).toLocaleDateString('id-ID')}
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end space-x-2">
            <button onclick="TransactionManagement.viewDetail('${trx.id}')" 
                    class="p-2 text-gray-400 hover:text-primary-600 transition-colors">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            ${['pending', 'processing'].includes(trx.status) ? `
            <button onclick="TransactionManagement.updateStatus('${trx.id}', 'success')" 
                    class="p-2 text-gray-400 hover:text-green-600 transition-colors" title="Mark Success">
              <i data-lucide="circle-check" class="w-4 h-4"></i>
            </button>
            <button onclick="TransactionManagement.updateStatus('${trx.id}', 'failed')" 
                    class="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Mark Failed">
              <i data-lucide="circle-x" class="w-4 h-4"></i>
            </button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');

    lucide.createIcons();
  },

  formatStatus(status) {
    const map = {
      'pending': 'Pending', 'processing': 'Proses',
      'success': 'Berhasil', 'failed': 'Gagal', 'refunded': 'Refund'
    };
    return map[status] || status;
  },

  async viewDetail(trxId) {
    const trx = this.state.transactions.find(t => t.id === trxId);
    if (!trx) return;

    const modal = document.getElementById('trxModal');
    modal.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-content max-w-2xl">
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="font-bold text-lg">Detail Transaksi</h3>
              <button onclick="App.hideModal()" class="p-2 text-gray-400 hover:text-gray-600">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p class="text-xs text-gray-500 mb-1">ID Transaksi</p>
                <p class="font-mono text-sm">${trx.transaction_id}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Status</p>
                <span class="status-badge ${trx.status}">${this.formatStatus(trx.status)}</span>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">User</p>
                <p class="font-medium">${trx.users?.full_name || '-'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Tanggal</p>
                <p class="font-medium">${new Date(trx.created_at).toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div class="bg-gray-50 rounded-xl p-4 mb-6">
              <h4 class="font-medium mb-3">Detail Voucher</h4>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-gray-500">Nama</p>
                  <p class="font-medium">${trx.vouchers?.name || '-'}</p>
                </div>
                <div>
                  <p class="text-gray-500">Nominal</p>
                  <p class="font-medium">${trx.vouchers?.nominal || '-'}</p>
                </div>
                <div>
                  <p class="text-gray-500">Provider</p>
                  <p class="font-medium">${trx.vouchers?.providers?.provider_name || '-'}</p>
                </div>
                <div>
                  <p class="text-gray-500">Nomor Tujuan</p>
                  <p class="font-mono">${trx.target_number || '-'}</p>
                </div>
              </div>
            </div>

            <div class="bg-green-50 rounded-xl p-4 mb-6">
              <h4 class="font-medium mb-3 text-green-800">Informasi Harga</h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-green-700">Harga Modal</span>
                  <span class="font-medium">Rp${trx.price_original?.toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-green-700">Harga Jual</span>
                  <span class="font-medium">Rp${trx.price_sell?.toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-green-700">Admin Fee</span>
                  <span class="font-medium">Rp${trx.admin_fee?.toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between font-bold text-green-900 pt-2 border-t border-green-200">
                  <span>Total</span>
                  <span>Rp${trx.total_amount?.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            ${trx.message ? `
            <div class="bg-yellow-50 rounded-xl p-4 mb-6">
              <p class="text-xs text-yellow-700 font-medium mb-1">Pesan</p>
              <p class="text-sm text-yellow-800">${trx.message}</p>
            </div>` : ''}

            ${trx.sn ? `
            <div class="bg-blue-50 rounded-xl p-4 mb-6">
              <p class="text-xs text-blue-700 font-medium mb-1">Serial Number</p>
              <p class="font-mono text-sm text-blue-800 break-all">${trx.sn}</p>
            </div>` : ''}

            <div class="space-y-3">
              ${['pending', 'processing'].includes(trx.status) ? `
              <div class="grid grid-cols-2 gap-3">
                <button onclick="TransactionManagement.updateStatus('${trx.id}', 'success'); App.hideModal();" 
                        class="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all">
                  Tandai Berhasil
                </button>
                <button onclick="TransactionManagement.updateStatus('${trx.id}', 'failed'); App.hideModal();" 
                        class="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all">
                  Tandai Gagal
                </button>
              </div>` : ''}
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

  async updateStatus(trxId, newStatus) {
    const message = prompt(`Masukkan pesan (opsional):`);
    
    try {
      App.showLoading(true);
      await App.request(`/admin/transactions/${trxId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, message: message || null })
      });

      Utils.showToast('success', 'Berhasil', `Status transaksi diubah ke ${newStatus}`);
      this.loadTransactions();
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal mengubah status');
    } finally {
      App.showLoading(false);
    }
  },

  exportCSV() {
    if (this.state.transactions.length === 0) {
      Utils.showToast('warning', 'Peringatan', 'Tidak ada data untuk diekspor');
      return;
    }

    const headers = ['ID Transaksi', 'User', 'Email', 'Voucher', 'Nominal', 'Nomor', 'Harga Modal', 'Harga Jual', 'Total', 'Status', 'Tanggal'];
    const rows = this.state.transactions.map(trx => [
      trx.transaction_id,
      trx.users?.full_name || '-',
      trx.users?.email || '-',
      trx.vouchers?.name || '-',
      trx.vouchers?.nominal || '-',
      trx.target_number,
      trx.price_original,
      trx.price_sell,
      trx.total_amount,
      trx.status,
      new Date(trx.created_at).toISOString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    Utils.showToast('success', 'Export', 'File CSV berhasil diunduh');
  },

  refresh() {
    this.state.pagination.page = 1;
    this.loadTransactions();
    Utils.showToast('success', 'Refresh', 'Data diperbarui');
  }
};

window.TransactionManagement = TransactionManagement;