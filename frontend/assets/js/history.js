const History = {
  state: {
    transactions: [],
    filters: { status: 'all' },
    pagination: { page: 1, limit: 15, hasMore: true }
  },

  init() {
    this.setupFilters();
    this.loadTransactions();
  },

  setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('active', 'bg-primary-600', 'text-white');
          b.classList.add('bg-gray-100', 'text-navy-600');
        });
        btn.classList.add('active', 'bg-primary-600', 'text-white');
        btn.classList.remove('bg-gray-100', 'text-navy-600');
        
        // Apply filter
        this.state.filters.status = btn.dataset.status;
        this.state.pagination.page = 1;
        this.loadTransactions();
      });
    });

    document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
      this.state.pagination.page++;
      this.loadTransactions(false);
    });
  },

  async loadTransactions(reset = true) {
    if (reset) {
      this.state.pagination.page = 1;
      this.state.pagination.hasMore = true;
    }

    if (!this.state.pagination.hasMore) return;

    const container = document.getElementById('transactionList');
    const emptyState = document.getElementById('emptyState');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (reset) {
      container.innerHTML = Array(5).fill(`
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-gray-200 rounded-xl"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-3/4"></div>
              <div class="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div class="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      `).join('');
    }

    try {
      const params = new URLSearchParams({
        page: this.state.pagination.page,
        limit: this.state.pagination.limit,
        ...(this.state.filters.status !== 'all' && { status: this.state.filters.status })
      });

      const data = await App.request(`/transactions?${params}`);
      
      if (reset) {
        this.state.transactions = data.data.transactions;
      } else {
        this.state.transactions = [...this.state.transactions, ...data.data.transactions];
      }

      this.state.pagination.hasMore = 
        this.state.transactions.length < (data.data.pagination?.total || 0);

      this.renderList(container);
      
      // Show/hide states
      if (this.state.transactions.length === 0 && reset) {
        container.classList.add('hidden');
        emptyState?.classList.remove('hidden');
        loadMoreBtn?.classList.add('hidden');
      } else {
        container.classList.remove('hidden');
        emptyState?.classList.add('hidden');
        loadMoreBtn?.classList.toggle('hidden', !this.state.pagination.hasMore);
      }

    } catch (err) {
      console.error('Load history error:', err);
      if (reset) {
        container.innerHTML = `
          <div class="text-center py-8">
            <i data-lucide="alert-circle" class="w-8 h-8 text-red-400 mx-auto mb-2"></i>
            <p class="text-gray-500 text-sm">Gagal memuat riwayat</p>
            <button onclick="History.loadTransactions()" class="mt-2 text-primary-600 text-sm font-medium">Coba Lagi</button>
          </div>
        `;
        lucide.createIcons();
      }
    }
  },

  renderList(container) {
    container.innerHTML = this.state.transactions.map(trx => `
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 card-hover cursor-pointer" 
           onclick="History.viewDetail('${trx.transaction_id}')">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center flex-shrink-0">
            <i data-lucide="${History.getIconForCategory(trx.vouchers?.category)}" class="w-6 h-6 text-primary-600"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <p class="font-medium text-navy-900 truncate">${trx.vouchers?.name || 'Voucher'}</p>
              <span class="status-badge ${trx.status} ml-2 flex-shrink-0">${History.formatStatus(trx.status)}</span>
            </div>
            <p class="text-xs text-gray-500 mb-1">
              ${trx.vouchers?.providers?.provider_name || '-'} • ${trx.vouchers?.nominal || '-'}
            </p>
            <p class="text-xs text-gray-400">${new Date(trx.created_at).toLocaleString('id-ID')}</p>
          </div>
          <div class="text-right flex-shrink-0">
            <p class="font-semibold text-navy-900">Rp${trx.total_amount?.toLocaleString('id-ID')}</p>
            ${trx.status === 'success' && trx.sn ? 
              '<p class="text-xs text-green-600 mt-1">✓ SN Tersedia</p>' : ''}
          </div>
        </div>
      </div>
    `).join('');
    
    lucide.createIcons();
  },

  getIconForCategory(category) {
    const icons = {
      'pulsa': 'smartphone', 'data': 'wifi', 'pln': 'zap',
      'ewallet': 'wallet', 'game': 'gamepad-2', 'ppob': 'credit-card'
    };
    return icons[category] || 'package';
  },

  formatStatus(status) {
    const map = {
      'pending': 'Menunggu', 'processing': 'Proses',
      'success': 'Berhasil', 'failed': 'Gagal', 'refunded': 'Refund'
    };
    return map[status] || status;
  },

  async viewDetail(transactionId) {
    try {
      App.showLoading(true);
      const data = await App.request(`/transactions/${transactionId}/status`);
      const trx = data.data.transaction;

      const modal = document.getElementById('detailModal');
      modal.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal-content">
            <div class="p-6">
              <!-- Header -->
              <div class="flex items-center justify-between mb-6">
                <h3 class="font-bold text-lg">Detail Transaksi</h3>
                <button onclick="App.hideModal()" class="p-2 text-gray-400 hover:text-gray-600">
                  <i data-lucide="x" class="w-5 h-5"></i>
                </button>
              </div>

              <!-- Status Badge -->
              <div class="text-center mb-6">
                <div class="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                  trx.status === 'success' ? 'bg-green-100' : 
                  trx.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                }">
                  <i data-lucide="${
                    trx.status === 'success' ? 'circle-check' : 
                    trx.status === 'failed' ? 'circle-x' : 'clock'
                  }" class="w-8 h-8 ${
                    trx.status === 'success' ? 'text-green-600' : 
                    trx.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                  }"></i>
                </div>
                <span class="status-badge ${trx.status} text-sm px-4 py-1.5">
                  ${History.formatStatus(trx.status)}
                </span>
              </div>

              <!-- Details -->
              <div class="space-y-4 mb-6">
                <div class="bg-gray-50 rounded-xl p-4">
                  <p class="text-xs text-gray-500 mb-1">ID Transaksi</p>
                  <p class="font-mono text-sm">${trx.transactionId}</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-xs text-gray-500 mb-1">Voucher</p>
                    <p class="font-medium">${trx.voucher?.name}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500 mb-1">Nominal</p>
                    <p class="font-medium">${trx.voucher?.nominal}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500 mb-1">Provider</p>
                    <p class="font-medium">${trx.voucher?.provider}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500 mb-1">Tanggal</p>
                    <p class="font-medium">${new Date(trx.createdAt).toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div>
                  <p class="text-xs text-gray-500 mb-1">Nomor Tujuan</p>
                  <p class="font-mono bg-gray-50 rounded-lg px-3 py-2">${trx.targetNumber}</p>
                </div>

                ${trx.serialNumber ? `
                <div>
                  <p class="text-xs text-gray-500 mb-1">Serial Number</p>
                  <p class="font-mono text-xs bg-green-50 text-green-800 rounded-lg px-3 py-2 break-all">${trx.serialNumber}</p>
                </div>` : ''}

                <div class="border-t pt-4">
                  <div class="flex justify-between text-sm mb-2">
                    <span class="text-gray-600">Harga Voucher</span>
                    <span>Rp${trx.price?.sell?.toLocaleString('id-ID')}</span>
                  </div>
                  <div class="flex justify-between text-sm mb-2">
                    <span class="text-gray-600">Admin Fee</span>
                    <span>Rp${trx.price?.adminFee?.toLocaleString('id-ID')}</span>
                  </div>
                  <div class="flex justify-between font-bold text-navy-900 text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>Rp${trx.totalAmount?.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

             <!-- Actions -->
<div class="space-y-3">

  ${trx.status === 'success' ? `
  <button onclick="History.downloadReceipt('${trx.transactionId}')" 
          class="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium btn-hover transition-all flex items-center justify-center space-x-2">
    <i data-lucide="download" class="w-4 h-4"></i>
    <span>Download Struk</span>
  </button>` : ''}

  ${trx.status === 'success' ? `
  <button onclick="window.location.href='/receipt.html?id=${trx.transaction_id}'" 
          class="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium btn-hover transition-all flex items-center justify-center space-x-2">
    <i data-lucide="receipt" class="w-4 h-4"></i>
    <span>Lihat Struk</span>
  </button>` : ''}

  ${['pending', 'processing'].includes(trx.status) ? `
  <button onclick="window.location.href='/payment.html?id=${trx.transactionId}'" 
          class="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium btn-hover transition-all">
    Lanjutkan Pembayaran
  </button>` : ''}

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
      
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal memuat detail transaksi');
    } finally {
      App.showLoading(false);
    }
  },

  async downloadReceipt(transactionId) {
    try {
      App.showLoading(true);
      const data = await App.request(`/payment/receipt/${transactionId}`);
      const receipt = data.data.receipt.receipt_data;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(Payment?.generateReceiptHTML?.(receipt) || this.generateSimpleReceipt(receipt));
      printWindow.document.close();
      printWindow.print();
      
      Utils.showToast('success', 'Struk', 'Siap dicetak/download');
      App.hideModal();
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal membuat struk');
    } finally {
      App.showLoading(false);
    }
  },

  generateSimpleReceipt(receipt) {
    return `
      <!DOCTYPE html><html><head><title>Struk</title>
      <style>body{font-family:monospace;padding:20px;max-width:400px;margin:auto}
      .center{text-align:center}.border{border-bottom:1px dashed #000;padding:10px 0}
      .row{display:flex;justify-content:space-between;margin:5px 0}.bold{font-weight:bold}
      </style></head><body>
      <div class="center"><h3>${receipt.merchant}</h3><p>${new Date(receipt.date).toLocaleString('id-ID')}</p><p>No: ${receipt.receiptNumber}</p></div>
      <div class="border"></div>
      <div class="row"><span>Voucher</span><span>${receipt.transaction.voucher.name}</span></div>
      <div class="row"><span>Nominal</span><span>${receipt.transaction.voucher.nominal}</span></div>
      <div class="row"><span>Provider</span><span>${receipt.transaction.voucher.provider}</span></div>
      <div class="row"><span>Nomor</span><span>${receipt.transaction.targetNumber}</span></div>
      ${receipt.transaction.serialNumber ? `<div class="row"><span>Serial</span><span>${receipt.transaction.serialNumber}</span></div>`:''}
      <div class="border"></div>
      <div class="row bold"><span>TOTAL</span><span>Rp${receipt.transaction.pricing.total.toLocaleString('id-ID')}</span></div>
      <div class="row"><span>Status</span><span>${receipt.transaction.status.toUpperCase()}</span></div>
      <div class="center" style="margin-top:20px;font-size:12px;color:#666">
        <p>Terima kasih berbelanja di ${receipt.merchant}</p>
      </div>
      </body></html>
    `;
  },

  refresh() {
    this.state.pagination.page = 1;
    this.loadTransactions();
    Utils.showToast('success', 'Refresh', 'Data diperbarui');
  }
};

window.History = History;