// Payment Page Logic
const Payment = {
  transactionId: null,
  pollInterval: null,
  countdownInterval: null,
  expiryTime: null,

  init(transactionId) {
    this.transactionId = transactionId;
    this.loadTransactionDetails();
    this.startCountdown(30 * 60); // 30 minutes
    this.startPolling();
  },

  async loadTransactionDetails() {
    try {
      App.showLoading(true);
      const data = await App.request(`/transactions/${this.transactionId}/status`);
      const trx = data.data.transaction;

      // Update order summary
      document.getElementById('voucherName').textContent = trx.voucher?.name || 'Voucher';
      document.getElementById('voucherDetail').textContent = 
        `${trx.voucher?.provider || '-'} • ${trx.voucher?.nominal || '-'}`;
      document.getElementById('targetNumber').textContent = trx.targetNumber;
      document.getElementById('voucherPrice').textContent = 
        `Rp${trx.price?.sell?.toLocaleString('id-ID') || '-'}`;
      document.getElementById('adminFee').textContent = 
        `Rp${trx.price?.adminFee?.toLocaleString('id-ID') || '0'}`;
      document.getElementById('totalAmount').textContent = 
        `Rp${trx.totalAmount?.toLocaleString('id-ID') || '-'}`;

      // Load QRIS if payment not yet created
      if (trx.paymentStatus === 'pending' && !trx.qrImageUrl) {
        await this.generateQRIS(trx.totalAmount);
      } else if (trx.qrImageUrl) {
        this.displayQRIS(trx.qrImageUrl, trx.qrString);
      }

      // Check if already paid
      if (trx.status === 'success') {
        this.showSuccess(trx);
      } else if (trx.status === 'failed') {
        this.showFailed(trx.message || 'Transaksi gagal');
      }

    } catch (err) {
      console.error('Load transaction error:', err);
      Utils.showToast('error', 'Error', 'Gagal memuat detail transaksi');
    } finally {
      App.showLoading(false);
    }
  },

  async generateQRIS(amount) {
    try {
      const data = await App.request(`/transactions/${this.transactionId}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          email: App.user?.email,
          phone: App.user?.phone
        })
      });

      const payment = data.data.payment;
      this.displayQRIS(payment.qrImageUrl, payment.qrString);
      this.expiryTime = new Date(payment.expiryTime).getTime();
      
    } catch (err) {
      console.error('Generate QRIS error:', err);
      Utils.showToast('error', 'Error', 'Gagal membuat QRIS');
    }
  },

  displayQRIS(imageUrl, qrString) {
    document.getElementById('qrisLoading').classList.add('hidden');
    document.getElementById('qrisDisplay').classList.remove('hidden');
    
    document.getElementById('qrImage').src = imageUrl;
    document.getElementById('qrString').value = qrString || '';
  },

  startCountdown(seconds) {
    const timerEl = document.getElementById('timer');
    const countdownEl = document.getElementById('countdown');
    
    this.expiryTime = Date.now() + (seconds * 1000);
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((this.expiryTime - now) / 1000));
      
      if (remaining <= 0) {
        clearInterval(this.countdownInterval);
        countdownEl?.classList.add('hidden');
        this.checkStatus(); // Final check
        return;
      }
      
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      
      // Warning when < 5 minutes
      if (remaining < 300) {
        countdownEl?.classList.remove('bg-orange-50', 'text-orange-600');
        countdownEl?.classList.add('bg-red-50', 'text-red-600');
      }
    };
    
    updateTimer();
    this.countdownInterval = setInterval(updateTimer, 1000);
  },

  startPolling() {
    this.pollInterval = setInterval(() => {
      this.checkStatus();
    }, 5000); // Check every 5 seconds
  },

  stopPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  },

  async checkStatus() {
    try {
      const data = await App.request(`/transactions/${this.transactionId}/status`);
      const trx = data.data.transaction;

      this.updateStatusUI(trx);

      if (trx.status === 'success') {
        this.stopPolling();
        this.showSuccess(trx);
      } else if (trx.status === 'failed' || trx.paymentStatus === 'expired') {
        this.stopPolling();
        this.showFailed(trx.message || 'Pembayaran gagal');
      }

    } catch (err) {
      console.log('Status check error:', err.message);
    }
  },

  updateStatusUI(trx) {
    const statusMap = {
      'pending': { icon: 'clock', title: 'Menunggu Pembayaran', desc: 'Silakan scan QRIS untuk melanjutkan', class: 'yellow' },
      'processing': { icon: 'loader', title: 'Memproses Pembayaran', desc: 'Mohon tunggu, sedang dikonfirmasi...', class: 'blue' },
      'success': { icon: 'circle-check', title: 'Pembayaran Berhasil', desc: 'Voucher sedang dikirim', class: 'green' },
      'failed': { icon: 'circle-x', title: 'Pembayaran Gagal', desc: trx.message || 'Silakan coba lagi', class: 'red' }
    };

    const status = statusMap[trx.status] || statusMap['pending'];
    const iconEl = document.getElementById('statusIcon');
    const titleEl = document.getElementById('statusTitle');
    const descEl = document.getElementById('statusDesc');
    const contentEl = document.getElementById('statusContent');

    // Update icon
    iconEl.setAttribute('data-lucide', status.icon);
    iconEl.className = `w-5 h-5 text-${status.class}-600`;
    
    // Update content
    titleEl.textContent = status.title;
    descEl.textContent = status.desc;
    
    // Update container color
    contentEl.className = `flex items-center space-x-3 p-3 rounded-xl bg-${status.class}-50`;
    
    lucide.createIcons();
  },

  showSuccess(trx) {
  document.getElementById('successTrxId').textContent = trx.transactionId;
  document.getElementById('successModal').classList.remove('hidden');
  document.getElementById('actionButtons')?.classList.add('hidden');

  // Tambahin tombol lihat struk
  const modalContent = document.querySelector('#successModal .modal-content');

  if (!document.getElementById('receiptBtn')) {
    const btn = document.createElement('button');
    btn.id = 'receiptBtn';
    btn.innerText = 'Lihat Struk';
    btn.onclick = () => {
      window.location.href = `/receipt.html?id=${trx.transactionId}`;
    };
    btn.className = "w-full py-3 mt-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium btn-hover transition-all";

    modalContent?.appendChild(btn);
  }

  // Add success animation
  const modal = document.querySelector('#successModal .modal-content');
  modal?.classList.add('animate-scale-in');
},

  showFailed(reason) {
    document.getElementById('failReason').textContent = reason;
    document.getElementById('failedModal').classList.remove('hidden');
    document.getElementById('actionButtons')?.classList.add('hidden');
    
    // Add shake animation
    const modal = document.querySelector('#failedModal .modal-content');
    modal?.classList.add('animate-shake');
  },

  async viewReceipt() {
    try {
      App.showLoading(true);
      const data = await App.request(`/payment/receipt/${this.transactionId}`);
      
      // Open receipt in new window
      const receipt = data.data.receipt.receipt_data;
      const printWindow = window.open('', '_blank');
      printWindow.document.write(this.generateReceiptHTML(receipt));
      printWindow.document.close();
      printWindow.print();
      
      Utils.showToast('success', 'Struk', 'Siap dicetak');
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal memuat struk');
    } finally {
      App.showLoading(false);
    }
  },

  generateReceiptHTML(receipt) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk - ${receipt.receiptNumber}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 400px; margin: auto; background: #fff; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; }
          .header h3 { margin: 0 0 5px 0; font-size: 18px; }
          .header p { margin: 2px 0; font-size: 12px; color: #666; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; }
          .row.label { color: #666; }
          .row.value { font-weight: bold; }
          .serial { font-size: 11px; word-break: break-all; background: #f9f9f9; padding: 8px; border-radius: 4px; margin: 10px 0; }
          .total { font-size: 16px; font-weight: bold; border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 12px 0; margin: 15px 0; }
          .status { text-align: center; padding: 10px; background: #e8f5e9; color: #2e7d32; border-radius: 8px; margin: 15px 0; font-weight: bold; }
          .status.failed { background: #ffebee; color: #c62828; }
          .footer { text-align: center; margin-top: 25px; font-size: 11px; color: #999; border-top: 1px dashed #ccc; padding-top: 15px; }
          .footer p { margin: 3px 0; }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h3>🔋 VEXA CELL</h3>
          <p>${receipt.merchant}</p>
          <p>${new Date(receipt.date).toLocaleString('id-ID')}</p>
          <p>No: ${receipt.receiptNumber}</p>
        </div>
        
        <div class="row label"><span>Voucher</span></div>
        <div class="row value"><span>${receipt.transaction.voucher.name}</span></div>
        
        <div class="row label"><span>Nominal</span></div>
        <div class="row value"><span>${receipt.transaction.voucher.nominal}</span></div>
        
        <div class="row label"><span>Provider</span></div>
        <div class="row value"><span>${receipt.transaction.voucher.provider}</span></div>
        
        <div class="row label"><span>Nomor Tujuan</span></div>
        <div class="row value"><span class="font-mono">${receipt.transaction.targetNumber}</span></div>
        
        ${receipt.transaction.serialNumber ? `
        <div class="row label"><span>Serial Number</span></div>
        <div class="serial">${receipt.transaction.serialNumber}</div>
        ` : ''}
        
        <div class="total">
          <div class="row"><span>TOTAL</span><span>Rp${receipt.transaction.pricing.total.toLocaleString('id-ID')}</span></div>
        </div>
        
        <div class="status ${receipt.transaction.status === 'failed' ? 'failed' : ''}">
          ${receipt.transaction.status.toUpperCase()}
        </div>
        
        <div class="footer">
          <p>Terima kasih telah berbelanja di ${receipt.merchant}</p>
          <p>Simpan struk ini sebagai bukti transaksi</p>
          <p class="no-print">💡 Tekan Ctrl+P untuk mencetak</p>
        </div>
      </body>
      </html>
    `;
  },

  copyQRString() {
    const qrString = document.getElementById('qrString').value;
    if (qrString) {
      navigator.clipboard.writeText(qrString).then(() => {
        Utils.showToast('success', 'Tersalin', 'String QRIS berhasil disalin');
      });
    }
  },

  async cancelTransaction() {
    if (!confirm('Yakin ingin membatalkan transaksi ini?')) return;
    
    try {
      App.showLoading(true);
      // Note: Implement cancel endpoint if needed
      // await App.request(`/transactions/${this.transactionId}/cancel`, { method: 'POST' });
      
      Utils.showToast('warning', 'Dibatalkan', 'Transaksi telah dibatalkan');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal membatalkan transaksi');
    } finally {
      App.showLoading(false);
      this.stopPolling();
    }
  },

  async retryPayment() {
    // Redirect to checkout with same voucher
    try {
      const data = await App.request(`/transactions/${this.transactionId}/status`);
      const trx = data.data.transaction;
      
      // Go back to checkout with voucher code
      window.location.href = `/?voucher=${trx.voucher?.code}&target=${trx.targetNumber}`;
    } catch {
      window.location.href = '/';
    }
  }
};

window.Payment = Payment;