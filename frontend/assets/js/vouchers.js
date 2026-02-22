// Voucher Management
const Vouchers = {
  state: {
    vouchers: [],
    categories: [],
    providers: [],
    filters: {
      category: 'all',
      provider: '',
      search: '',
      sort: 'popular'
    },
    pagination: {
      page: 1,
      limit: 20,
      hasMore: true
    }
  },

  async init() {
    await this.loadCategories();
    await this.loadProviders();
    await this.loadAll();
    this.setupListeners();
  },

  async loadCategories() {
    try {
      const data = await App.request('/vouchers/categories');
      this.state.categories = data.data.categories;
    } catch (err) {
      console.error('Failed to load categories');
    }
  },

  async loadProviders() {
    try {
      const data = await App.request('/vouchers/providers');
      this.state.providers = data.data.providers;
      this.renderProviderFilter();
    } catch (err) {
      console.error('Failed to load providers');
    }
  },

  renderProviderFilter() {
    const select = document.getElementById('providerFilter');
    if (!select) return;

    // Keep "Semua Provider" option
    const defaultOption = select.querySelector('option[value=""]');
    select.innerHTML = '';
    if (defaultOption) select.appendChild(defaultOption);

    this.state.providers.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider.provider_code;
      option.textContent = provider.provider_name;
      select.appendChild(option);
    });
  },

  async loadAll(reset = true) {
    if (reset) {
      this.state.pagination.page = 1;
      this.state.pagination.hasMore = true;
    }

    if (!this.state.pagination.hasMore) return;

    const grid = document.getElementById('voucherGrid');
    const emptyState = document.getElementById('emptyState');
    const countEl = document.getElementById('voucherCount');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (reset) {
      // Show skeletons
      grid.innerHTML = Array(10).fill(`
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
          <div class="w-12 h-12 bg-gray-200 rounded-xl mb-3"></div>
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
          <div class="h-6 bg-gray-200 rounded w-full mb-2"></div>
          <div class="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      `).join('');
      emptyState?.classList.add('hidden');
      loadMoreBtn?.classList.add('hidden');
    }

    try {
      const params = new URLSearchParams({
        page: this.state.pagination.page,
        limit: this.state.pagination.limit,
        ...(this.state.filters.category !== 'all' && { category: this.state.filters.category }),
        ...(this.state.filters.provider && { provider: this.state.filters.provider }),
        ...(this.state.filters.search && { search: this.state.filters.search })
      });

      const data = await App.request(`/vouchers?${params}`);
      
      if (reset) {
        this.state.vouchers = data.data.vouchers;
      } else {
        this.state.vouchers = [...this.state.vouchers, ...data.data.vouchers];
      }

      this.state.pagination.hasMore = 
        this.state.vouchers.length < (data.data.total || 0);

      this.renderGrid(grid);
      
      countEl.textContent = `${data.data.total || 0} voucher`;
      
      // Show/hide empty state
      if (this.state.vouchers.length === 0) {
        grid.classList.add('hidden');
        emptyState?.classList.remove('hidden');
        loadMoreBtn?.classList.add('hidden');
      } else {
        grid.classList.remove('hidden');
        emptyState?.classList.add('hidden');
        loadMoreBtn?.classList.toggle('hidden', !this.state.pagination.hasMore);
      }

    } catch (err) {
      console.error('Failed to load vouchers');
      if (reset) {
        grid.innerHTML = `
          <div class="col-span-full text-center py-8">
            <i data-lucide="alert-circle" class="w-8 h-8 text-red-400 mx-auto mb-2"></i>
            <p class="text-gray-500 text-sm">Gagal memuat voucher</p>
            <button onclick="Vouchers.loadAll()" class="mt-2 text-primary-600 text-sm font-medium">Coba Lagi</button>
          </div>
        `;
        lucide.createIcons();
      }
    }
  },

  renderGrid(container) {
    container.innerHTML = this.state.vouchers.map(voucher => `
      <div class="voucher-card" data-code="${voucher.voucher_code}" data-price="${voucher.price_sell}">
        <div class="voucher-icon">
          ${voucher.providers?.logo_url 
            ? `<img src="${voucher.providers.logo_url}" alt="${voucher.providers.provider_name}" class="w-7 h-7 object-contain">`
            : `<i data-lucide="${this.getIconForCategory(voucher.category)}" class="w-6 h-6"></i>`
          }
        </div>
        <div class="voucher-name">${voucher.name}</div>
        <div class="voucher-meta">
          ${voucher.providers?.provider_name || '-'} • ${voucher.nominal}
        </div>
        <div class="voucher-price">Rp${voucher.price_sell.toLocaleString('id-ID')}</div>
        <button class="voucher-btn btn-hover" onclick="Vouchers.showBuyModal('${voucher.voucher_code}')">
          Beli
        </button>
      </div>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('.voucher-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          const code = card.dataset.code;
          Vouchers.showDetailModal(code);
        }
      });
    });
    
    lucide.createIcons();
  },

  getIconForCategory(category) {
    const icons = {
      'pulsa': 'smartphone',
      'data': 'wifi',
      'pln': 'zap',
      'ewallet': 'wallet',
      'game': 'gamepad-2',
      'ppob': 'credit-card'
    };
    return icons[category] || 'package';
  },

  setupListeners() {
    // Category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.category-tab').forEach(t => {
          t.classList.remove('active', 'bg-primary-600', 'text-white');
          t.classList.add('bg-white', 'text-navy-600', 'border');
        });
        tab.classList.add('active', 'bg-primary-600', 'text-white');
        tab.classList.remove('bg-white', 'text-navy-600', 'border');
        
        this.state.filters.category = tab.dataset.category;
        this.state.pagination.page = 1;
        this.loadAll();
      });
    });

    // Search
    document.getElementById('voucherSearch')?.addEventListener('input', 
      Utils.debounce((e) => {
        this.state.filters.search = e.target.value;
        this.state.pagination.page = 1;
        this.loadAll();
      }, 300)
    );

    // Provider filter
    document.getElementById('providerFilter')?.addEventListener('change', (e) => {
      this.state.filters.provider = e.target.value;
      this.state.pagination.page = 1;
      this.loadAll();
    });

    // Sort filter
    document.getElementById('sortFilter')?.addEventListener('change', (e) => {
      this.state.filters.sort = e.target.value;
      this.state.pagination.page = 1;
      this.loadAll();
    });

    // Load more
    document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
      this.state.pagination.page++;
      this.loadAll(false);
    });
  },

  async showDetailModal(voucherCode) {
    try {
      App.showLoading(true);
      const data = await App.request(`/vouchers/${voucherCode}`);
      const voucher = data.data.voucher;

      App.showModal(`
        <div class="p-6">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center">
              ${voucher.providers?.logo_url 
                ? `<img src="${voucher.providers.logo_url}" class="w-10 h-10 object-contain">`
                : `<i data-lucide="${Vouchers.getIconForCategory(voucher.category)}" class="w-8 h-8 text-primary-600"></i>`
              }
            </div>
            <div>
              <h3 class="font-bold text-lg text-navy-900">${voucher.name}</h3>
              <p class="text-sm text-gray-500">${voucher.providers?.provider_name} • ${voucher.nominal}</p>
            </div>
          </div>

          <div class="space-y-3 mb-6">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Harga</span>
              <span class="font-semibold">Rp${voucher.price_sell.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Provider</span>
              <span class="font-medium">${voucher.providers?.provider_name}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Kategori</span>
              <span class="font-medium">${Vouchers.formatCategory(voucher.category)}</span>
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-navy-700 mb-2">Nomor Tujuan</label>
            <input type="tel" id="targetNumber" placeholder="0812xxxxxxxx" 
                   class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                   pattern="[0-9]{10,15}">
            <p class="text-xs text-gray-500 mt-1">Masukkan nomor tanpa spasi atau tanda</p>
          </div>

          <button onclick="Vouchers.initiatePurchase('${voucherCode}')" 
                  class="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium btn-hover transition-all">
            Lanjutkan Pembayaran
          </button>
        </div>
      `);
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal memuat detail voucher');
    } finally {
      App.showLoading(false);
    }
  },

  async showBuyModal(voucherCode) {
    await this.showDetailModal(voucherCode);
  },

  async initiatePurchase(voucherCode) {
    const targetNumber = document.getElementById('targetNumber')?.value?.trim();
    
    if (!targetNumber || !/^\d{10,15}$/.test(targetNumber)) {
      Utils.showToast('warning', 'Validasi', 'Masukkan nomor tujuan yang valid');
      return;
    }

    App.showLoading(true);
    App.hideModal();

    try {
      // Create transaction
      const trxData = await App.request('/transactions', {
        method: 'POST',
        body: JSON.stringify({ voucherCode, targetNumber })
      });

      const transaction = trxData.data.transaction;

      // Create payment QRIS
      const paymentData = await App.request(`/transactions/${transaction.transactionId}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          email: App.user?.email,
          phone: App.user?.phone
        })
      });

      // Show payment page
      window.location.href = `/payment.html?id=${transaction.transactionId}`;

    } catch (err) {
      App.showLoading(false);
      Utils.showToast('error', 'Gagal', err.message || 'Gagal memproses pembelian');
    }
  },

  formatCategory(code) {
    const map = {
      'pulsa': 'Pulsa',
      'data': 'Paket Data',
      'pln': 'Token PLN',
      'ewallet': 'E-Wallet',
      'game': 'Voucher Game',
      'ppob': 'PPOB'
    };
    return map[code] || code.toUpperCase();
  }
};

// Utility: Debounce
Utils.debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

window.Vouchers = Vouchers;