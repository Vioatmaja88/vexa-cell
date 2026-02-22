// Vexa Cell - Receipt Page Logic

const Receipt = {
  state: {
    receipt: null,
    transaction: null
  },

  async init() {
    // Get transaction ID from URL
    const transactionId = Utils.getUrlParam('id');
    
    if (!transactionId) {
      this.showError('ID transaksi tidak ditemukan');
      return;
    }

    // Load receipt data
    await this.loadReceipt(transactionId);
  },

  async loadReceipt(transactionId) {
    try {
      const data = await App.request(`/payment/receipt/${transactionId}`);
      this.state.receipt = data.data.receipt;
      this.state.transaction = data.data.receipt.receipt_data;

      this.renderReceipt();
      
      // Show receipt content
      document.getElementById('loadingState').classList.add('hidden');
      document.getElementById('receiptContent').classList.remove('hidden');

    } catch (err) {
      console.error('Load receipt error:', err);
      this.showError('Gagal memuat struk. Transaksi mungkin belum selesai diproses.');
    }
  },

  renderReceipt() {
    const receipt = this.state.receipt;
    const trx = this.state.transaction;

    if (!receipt || !trx) {
      this.showError('Data struk tidak lengkap');
      return;
    }

    // Transaction ID & Date
    document.getElementById('receiptTrxId').textContent = trx.transaction?.id || '-';
    document.getElementById('receiptDate').textContent = Utils.formatDateTime(trx.date);
    document.getElementById('receiptNumber').textContent = receipt.receipt_number || '-';

    // Status
    const statusEl = document.getElementById('receiptStatus');
    const statusConfig = this.getStatusConfig(trx.transaction?.status);
    statusEl.className = `status-badge ${statusConfig.class}`;
    statusEl.textContent = statusConfig.label;

    // Voucher Info
    document.getElementById('voucherName').textContent = trx.transaction?.voucher?.name || '-';
    document.getElementById('voucherProvider').textContent = trx.transaction?.voucher?.provider || '-';
    document.getElementById('voucherNominal').textContent = trx.transaction?.voucher?.nominal || '-';
    document.getElementById('voucherCategory').textContent = 
      this.formatCategory(trx.transaction?.voucher?.category) || '-';

    // Voucher Icon
    const iconEl = document.getElementById('voucherIcon');
    const iconMap = {
      'pulsa': 'smartphone',
      'data': 'wifi',
      'pln': 'zap',
      'ewallet': 'wallet',
      'game': 'gamepad-2',
      'ppob': 'credit-card'
    };
    iconEl.setAttribute('data-lucide', iconMap[trx.transaction?.voucher?.category] || 'package');
    lucide.createIcons();

    // Target Number
    document.getElementById('targetNumber').textContent = trx.transaction?.targetNumber || '-';

    // Serial Number
    const serialSection = document.getElementById('serialNumberSection');
    const serialEl = document.getElementById('serialNumber');
    if (trx.transaction?.serialNumber) {
      serialSection.classList.remove('hidden');
      serialEl.textContent = trx.transaction.serialNumber;
    } else {
      serialSection.classList.add('hidden');
    }

    // Price Breakdown
    const pricing = trx.transaction?.pricing || {};
    document.getElementById('priceVoucher').textContent = Utils.formatCurrency(pricing.sell || 0);
    document.getElementById('priceAdmin').textContent = Utils.formatCurrency(pricing.adminFee || 0);
    document.getElementById('priceDiscount').textContent = `-${Utils.formatCurrency(pricing.discount || 0)}`;
    document.getElementById('priceTotal').textContent = Utils.formatCurrency(pricing.total || 0);

    // Customer Info
    const customer = trx.customer || {};
    document.getElementById('customerEmail').textContent = customer.email || '-';
    document.getElementById('transactionTime').textContent = Utils.formatDateTime(trx.date);
  },

  getStatusConfig(status) {
    const config = {
      'success': { class: 'success', label: 'BERHASIL' },
      'pending': { class: 'pending', label: 'MENUNGGU' },
      'processing': { class: 'processing', label: 'DIPROSES' },
      'failed': { class: 'failed', label: 'GAGAL' },
      'refunded': { class: 'warning', label: 'REFUND' }
    };
    return config[status] || { class: 'pending', label: status.toUpperCase() };
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
    return map[code] || code;
  },

  showError(message) {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('errorMessage').textContent = message;
  },

  // Copy target number to clipboard
  async copyNumber() {
    const number = document.getElementById('targetNumber')?.textContent;
    if (number && number !== '-') {
      const success = await Utils.copyToClipboard(number);
      if (success) {
        Utils.showToast('success', 'Tersalin', 'Nomor berhasil disalin');
      } else {
        Utils.showToast('error', 'Gagal', 'Gagal menyalin nomor');
      }
    }
  },

  // Copy serial number to clipboard
  async copySerial() {
    const serial = document.getElementById('serialNumber')?.textContent;
    if (serial && serial !== '-') {
      const success = await Utils.copyToClipboard(serial);
      if (success) {
        Utils.showToast('success', 'Tersalin', 'Serial number berhasil disalin');
      } else {
        Utils.showToast('error', 'Gagal', 'Gagal menyalin serial number');
      }
    }
  },

  // Print receipt
  print() {
    window.print();
  },

  // Download as PDF
  async downloadPDF() {
    try {
      Utils.showToast('info', 'Download', 'Menyiapkan PDF...');
      
      // Use browser's print to PDF functionality
      // For production, consider using html2pdf.js or similar library
      this.print();
      
      Utils.showToast('success', 'Info', 'Gunakan "Save as PDF" pada dialog print');
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal download PDF');
    }
  },

  // Share receipt
  async share() {
    const trx = this.state.transaction;
    if (!trx) return;

    const shareData = {
      title: 'Struk Transaksi - Vexa Cell',
      text: `Bukti transaksi ${trx.transaction?.voucher?.name} sebesar ${Utils.formatCurrency(trx.transaction?.pricing?.total)}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        Utils.showToast('success', 'Berhasil', 'Struk berhasil dibagikan');
      } catch (err) {
        if (err.name !== 'AbortError') {
          Utils.showToast('error', 'Gagal', 'Gagal membagikan struk');
        }
      }
    } else {
      // Fallback: copy link
      const success = await Utils.copyToClipboard(window.location.href);
      if (success) {
        Utils.showToast('success', 'Tersalin', 'Link struk berhasil disalin');
      }
    }
  },

  // Generate HTML for PDF export
  generatePDFHTML() {
    const trx = this.state.transaction;
    if (!trx) return '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk - ${trx.receiptNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; padding: 20px; background: #fff; }
          .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #000; padding: 20px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; }
          .header h1 { font-size: 20px; margin-bottom: 5px; }
          .header p { font-size: 12px; color: #666; margin: 2px 0; }
          .section { margin: 15px 0; }
          .section-title { font-size: 12px; color: #666; margin-bottom: 5px; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; }
          .row.total { font-weight: bold; font-size: 15px; border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 10px 0; margin: 15px 0; }
          .serial { background: #f0f0f0; padding: 10px; font-size: 11px; word-break: break-all; margin: 10px 0; }
          .status { text-align: center; padding: 8px; background: #e8f5e9; color: #2e7d32; font-weight: bold; margin: 15px 0; }
          .status.failed { background: #ffebee; color: #c62828; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; border-top: 1px dashed #ccc; padding-top: 15px; }
          .footer p { margin: 3px 0; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>🔋 VEXA CELL</h1>
            <p>${trx.merchant}</p>
            <p>${new Date(trx.date).toLocaleString('id-ID')}</p>
            <p>No: ${trx.receiptNumber}</p>
          </div>

          <div class="section">
            <div class="section-title">Voucher</div>
            <div class="row"><span>Produk</span><span>${trx.transaction.voucher.name}</span></div>
            <div class="row"><span>Nominal</span><span>${trx.transaction.voucher.nominal}</span></div>
            <div class="row"><span>Provider</span><span>${trx.transaction.voucher.provider}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Nomor Tujuan</div>
            <div class="row"><span class="font-mono">${trx.transaction.targetNumber}</span></div>
          </div>

          ${trx.transaction.serialNumber ? `
          <div class="section">
            <div class="section-title">Serial Number</div>
            <div class="serial">${trx.transaction.serialNumber}</div>
          </div>` : ''}

          <div class="row total">
            <span>TOTAL</span>
            <span>Rp${trx.transaction.pricing.total.toLocaleString('id-ID')}</span>
          </div>

          <div class="status ${trx.transaction.status === 'failed' ? 'failed' : ''}">
            ${trx.transaction.status.toUpperCase()}
          </div>

          <div class="footer">
            <p>Terima kasih telah berbelanja di ${trx.merchant}</p>
            <p>Simpan struk ini sebagai bukti transaksi</p>
            <p>Support: support@vexacell.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
};

window.Receipt = Receipt;