// Vexa Cell - Checkout Page Logic

const Checkout = {
  state: {
    voucher: null,
    price: {
      original: 0,
      sell: 0,
      adminFee: 0,
      discount: 0,
      total: 0
    }
  },

  async init() {
    // Get voucher code from URL
    const voucherCode = Utils.getUrlParam('voucher');
    
    if (!voucherCode) {
      Utils.showToast('error', 'Error', 'Voucher tidak ditemukan');
      setTimeout(() => window.location.href = '/', 1500);
      return;
    }

    // Load voucher details
    await this.loadVoucher(voucherCode);
    this.setupEventListeners();
    this.updatePriceDisplay();
  },

  async loadVoucher(code) {
    try {
      App.showLoading(true);
      const data = await App.request(`/vouchers/${code}`);
      this.state.voucher = data.data.voucher;

      // Calculate prices
      this.state.price.sell = this.state.voucher.price_sell;
      this.state.price.original = this.state.voucher.price_original;
      this.state.price.adminFee = 0; // Can be configured
      this.state.price.discount = 0; // Can add promo logic
      this.state.price.total = this.state.price.sell + this.state.price.adminFee - this.state.price.discount;

      // Render voucher info
      this.renderVoucherInfo();
      this.updatePriceDisplay();

    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal memuat voucher');
      setTimeout(() => window.location.href = '/', 1000);
    } finally {
      App.showLoading(false);
    }
  },

  renderVoucherInfo() {
    const voucher = this.state.voucher;
    
    document.getElementById('voucherName').textContent = voucher.name;
    document.getElementById('voucherDetail').textContent = 
      `${voucher.providers?.provider_name || '-'} • ${voucher.nominal}`;
    document.getElementById('voucherNominal').textContent = voucher.nominal;
    document.getElementById('voucherProvider').textContent = voucher.providers?.provider_name || '-';
    
    // Set icon based on category
    const iconEl = document.getElementById('voucherIcon');
    const iconMap = {
      'pulsa': 'smartphone',
      'data': 'wifi',
      'pln': 'zap',
      'ewallet': 'wallet',
      'game': 'gamepad-2',
      'ppob': 'credit-card'
    };
    iconEl.setAttribute('data-lucide', iconMap[voucher.category] || 'package');
    lucide.createIcons();
  },

  updatePriceDisplay() {
    const price = this.state.price;
    
    document.getElementById('voucherPrice').textContent = Utils.formatCurrency(price.sell);
    document.getElementById('adminFee').textContent = Utils.formatCurrency(price.adminFee);
    document.getElementById('discount').textContent = `-${Utils.formatCurrency(price.discount)}`;
    document.getElementById('totalAmount').textContent = Utils.formatCurrency(price.total);
  },

  setupEventListeners() {
    const targetInput = document.getElementById('targetNumber');
    const emailInput = document.getElementById('email');
    const notesInput = document.getElementById('notes');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutBtnLoading = document.getElementById('checkoutBtnLoading');
    const termsCheckbox = document.getElementById('terms');

    // Target number validation
    targetInput?.addEventListener('input', (e) => {
      // Only allow numbers
      e.target.value = e.target.value.replace(/\D/g, '');
      
      // Clear error
      const errorEl = document.getElementById('numberError');
      if (errorEl) errorEl.classList.add('hidden');
    });

    // Character count for notes
    notesInput?.addEventListener('input', (e) => {
      document.getElementById('charCount').textContent = e.target.value.length;
    });

    // Email autofill from user profile
    if (App.user?.email && !emailInput?.value) {
      emailInput.value = App.user.email;
    }

    // Checkout button click
    checkoutBtn?.addEventListener('click', async () => {
      await this.processCheckout();
    });

    // Enter key to submit
    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.processCheckout();
      }
    });
  },

  validateForm() {
    const targetNumber = document.getElementById('targetNumber')?.value?.trim();
    const termsChecked = document.getElementById('terms')?.checked;
    const errorEl = document.getElementById('numberError');

    // Validate target number
    if (!targetNumber) {
      if (errorEl) {
        errorEl.textContent = 'Nomor tujuan wajib diisi';
        errorEl.classList.remove('hidden');
      }
      document.getElementById('targetNumber')?.focus();
      return false;
    }

    if (!Utils.isValidPhone(targetNumber)) {
      if (errorEl) {
        errorEl.textContent = 'Format nomor tidak valid (gunakan 08xxxxxxxxxx)';
        errorEl.classList.remove('hidden');
      }
      document.getElementById('targetNumber')?.focus();
      return false;
    }

    // Validate terms
    if (!termsChecked) {
      Utils.showToast('warning', 'Validasi', 'Anda harus menyetujui syarat & ketentuan');
      document.getElementById('terms')?.focus();
      return false;
    }

    return true;
  },

  async processCheckout() {
    if (!this.validateForm()) return;

    const targetNumber = Utils.sanitizePhone(document.getElementById('targetNumber').value);
    const email = document.getElementById('email')?.value?.trim();
    const notes = document.getElementById('notes')?.value?.trim();

    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutBtnLoading = document.getElementById('checkoutBtnLoading');

    // Show loading state
    checkoutBtn?.classList.add('hidden');
    checkoutBtnLoading?.classList.remove('hidden');
    checkoutBtnLoading?.classList.add('flex');

    try {
      // Create transaction
      const trxData = await App.request('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          voucherCode: this.state.voucher.voucher_code,
          targetNumber,
          email,
          notes
        })
      });

      const transaction = trxData.data.transaction;

      // Generate QRIS payment
      const paymentData = await App.request(`/transactions/${transaction.transactionId}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          email: email || App.user?.email,
          phone: App.user?.phone
        })
      });

      Utils.showToast('success', 'Berhasil', 'Transaksi dibuat, lanjutkan pembayaran');

      // Redirect to payment page
      setTimeout(() => {
        window.location.href = `/payment.html?id=${transaction.transactionId}`;
      }, 500);

    } catch (err) {
      // Reset button state
      checkoutBtn?.classList.remove('hidden');
      checkoutBtnLoading?.classList.add('hidden');
      checkoutBtnLoading?.classList.remove('flex');

      // Show error
      Utils.showToast('error', 'Gagal', err.message || 'Gagal memproses transaksi');

      // Shake animation
      const form = document.getElementById('targetNumber')?.closest('form') || document.querySelector('main');
      form?.classList.add('animate-shake');
      setTimeout(() => form?.classList.remove('animate-shake'), 300);
    }
  },

  // Quick buy from homepage
  async quickBuy(voucherCode, targetNumber = '') {
    try {
      // Load voucher
      const data = await App.request(`/vouchers/${voucherCode}`);
      this.state.voucher = data.data.voucher;

      // Set prices
      this.state.price.sell = this.state.voucher.price_sell;
      this.state.price.total = this.state.price.sell;

      // Render
      this.renderVoucherInfo();
      this.updatePriceDisplay();

      // Pre-fill number if provided
      if (targetNumber) {
        document.getElementById('targetNumber').value = targetNumber;
      }

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal memuat voucher');
    }
  }
};

window.Checkout = Checkout;