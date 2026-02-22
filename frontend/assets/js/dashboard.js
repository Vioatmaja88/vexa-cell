const Dashboard = {
  async loadStats() {
    try {
      const data = await App.request('/transactions?limit=100');
      const transactions = data.data.transactions;
      
      const total = transactions.length;
      const success = transactions.filter(t => t.status === 'success').length;
      const pending = transactions.filter(t => ['pending', 'processing'].includes(t.status)).length;
      const totalSpent = transactions
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + t.total_amount, 0);

      document.getElementById('statTransactions').textContent = total;
      document.getElementById('statSuccess').textContent = success;
      document.getElementById('statPending').textContent = pending;
      
      // Format currency
      const spentEl = document.querySelector('.bg-purple-100 + p');
      if (spentEl) {
        spentEl.textContent = `Rp${totalSpent.toLocaleString('id-ID')}`;
      }
    } catch (err) {
      console.error('Failed to load stats');
    }
  },

  async loadRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    
    try {
      const data = await App.request('/transactions?limit=5');
      const transactions = data.data.transactions;

      if (transactions.length === 0) {
        container.innerHTML = `
          <div class="p-8 text-center">
            <i data-lucide="inbox" class="w-10 h-10 text-gray-300 mx-auto mb-3"></i>
            <p class="text-gray-500 text-sm">Belum ada transaksi</p>
            <button onclick="window.location.href='/'" class="mt-3 text-primary-600 text-sm font-medium">Mulai Beli</button>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      container.innerHTML = transactions.map(trx => `
        <div class="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onclick="Dashboard.viewTransaction('${trx.transaction_id}')">
          <div class="flex items-center space-x-4">
            <div class="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center flex-shrink-0">
              <i data-lucide="${Dashboard.getIconForCategory(trx.vouchers?.category)}" class="w-5 h-5 text-primary-600"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-navy-900 truncate">${trx.vouchers?.name || 'Voucher'}</p>
              <p class="text-xs text-gray-500">${trx.target_number} • ${new Date(trx.created_at).toLocaleDateString('id-ID')}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-sm font-semibold text-navy-900">Rp${trx.total_amount.toLocaleString('id-ID')}</p>
              <span class="status-badge ${trx.status}">${Dashboard.formatStatus(trx.status)}</span>
            </div>
          </div>
        </div>
      `).join('');
      
      lucide.createIcons();
    } catch (err) {
      container.innerHTML = `
        <div class="p-4 text-center text-red-500 text-sm">
          Gagal memuat transaksi
        </div>
      `;
    }
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
      'success': 'Berhasil', 'failed': 'Gagal'
    };
    return map[status] || status;
  },

  async viewTransaction(transactionId) {
    try {
      App.showLoading(true);
      const data = await App.request(`/transactions/${transactionId}/status`);
      const trx = data.data.transaction;
      
      App.showModal(`
        <div class="p-6">
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
            <h3 class="font-bold text-lg">${Dashboard.formatStatus(trx.status)}</h3>
            <p class="text-sm text-gray-500">${trx.transactionId}</p>
          </div>
          
          <div class="space-y-3 mb-6 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Voucher</span>
              <span class="font-medium">${trx.voucher?.name} (${trx.voucher?.nominal})</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Provider</span>
              <span class="font-medium">${trx.voucher?.provider}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Nomor Tujuan</span>
              <span class="font-mono">${trx.targetNumber}</span>
            </div>
            ${trx.serialNumber ? `
            <div class="flex justify-between">
              <span class="text-gray-600">Serial Number</span>
              <span class="font-mono text-xs break-all">${trx.serialNumber}</span>
            </div>` : ''}
            <div class="flex justify-between font-bold text-navy-900 pt-2 border-t">
              <span>Total</span>
              <span>Rp${trx.totalAmount?.toLocaleString('id-ID')}</span>
            </div>
          </div>

          ${trx.status === 'success' ? `
<div class="space-y-2">
  <button onclick="Dashboard.downloadReceipt('${trx.transactionId}')" 
          class="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium btn-hover transition-all flex items-center justify-center space-x-2">
    <i data-lucide="download" class="w-4 h-4"></i>
    <span>Download Struk</span>
  </button>

  <button onclick="window.location.href='/receipt.html?id=${trx.transactionId}'" 
          class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-navy-700 rounded-xl font-medium transition-all flex items-center justify-center space-x-2">
    <i data-lucide="receipt" class="w-4 h-4"></i>
    <span>Lihat Struk</span>
  </button>

  <button onclick="App.hideModal()" 
          class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-navy-700 rounded-xl font-medium transition-all">
    Tutup
  </button>
</div>` : `
          <button onclick="App.hideModal()" 
                  class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-navy-700 rounded-xl font-medium transition-all">
            Tutup
          </button>
          `}
        </div>
      `, { showClose: false });
      
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
      
      // Create printable receipt
      const receipt = data.data.receipt.receipt_data;
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Struk - ${receipt.receiptNumber}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 400px; margin: auto; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>${receipt.merchant}</h3>
            <p>${new Date(receipt.date).toLocaleString('id-ID')}</p>
            <p>No: ${receipt.receiptNumber}</p>
          </div>
          <div class="row"><span>Voucher</span><span>${receipt.transaction.voucher.name}</span></div>
          <div class="row"><span>Nominal</span><span>${receipt.transaction.voucher.nominal}</span></div>
          <div class="row"><span>Provider</span><span>${receipt.transaction.voucher.provider}</span></div>
          <div class="row"><span>Nomor</span><span>${receipt.transaction.targetNumber}</span></div>
          ${receipt.transaction.serialNumber ? `<div class="row"><span>Serial</span><span>${receipt.transaction.serialNumber}</span></div>` : ''}
          <div class="row total"><span>TOTAL</span><span>Rp${receipt.transaction.pricing.total.toLocaleString('id-ID')}</span></div>
          <div class="row"><span>Status</span><span>${receipt.transaction.status.toUpperCase()}</span></div>
          <div class="footer">
            <p>Terima kasih telah berbelanja di ${receipt.merchant}</p>
            <p>Simpan struk ini sebagai bukti transaksi</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      
      Utils.showToast('success', 'Struk', 'Siap dicetak/download');
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal membuat struk');
    } finally {
      App.showLoading(false);
      App.hideModal();
    }
  },

  setupMobileSidebar() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileClose = document.getElementById('mobileSidebarClose');
    const overlay = document.getElementById('mobileOverlay');
    const sidebar = document.getElementById('mobileSidebar');
    const mobileNav = document.getElementById('mobileNav');

    // Clone desktop nav to mobile
    const desktopNav = document.querySelector('#sidebar nav');
    if (desktopNav && mobileNav) {
      mobileNav.innerHTML = desktopNav.innerHTML;
    }

    const openSidebar = () => {
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    };

    const closeSidebar = () => {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
      document.body.style.overflow = '';
    };

    mobileBtn?.addEventListener('click', openSidebar);
    mobileClose?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);

    // Close on nav link click
    mobileNav?.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') closeSidebar();
    });

    // Mobile user menu
    document.getElementById('mobileUserBtn')?.addEventListener('click', () => {
      App.showModal(`
        <div class="p-6">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-xl">
              ${(App.user.fullName?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <p class="font-semibold text-navy-900">${App.user.fullName || 'User'}</p>
              <p class="text-sm text-gray-500">${App.user.email}</p>
            </div>
          </div>
          <div class="space-y-2">
            <a href="/history.html" class="block px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors">
              <i data-lucide="clock" class="w-4 h-4 inline mr-2"></i>Riwayat Transaksi
            </a>
            <button id="mobileLogout" class="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-medium text-red-600 transition-colors">
              <i data-lucide="log-out" class="w-4 h-4 inline mr-2"></i>Keluar
            </button>
          </div>
        </div>
      `);
      lucide.createIcons();
      
      document.getElementById('mobileLogout')?.addEventListener('click', () => {
        App.logout();
      });
    });

    // Sidebar logout
    document.getElementById('sidebarLogout')?.addEventListener('click', () => {
      App.logout();
    });
  }
};

window.Dashboard = Dashboard;