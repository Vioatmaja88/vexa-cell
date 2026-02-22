const MarginManagement = {
  state: {
    margins: []
  },

  init() {
    this.setupEventListeners();
    this.loadMargins();
    this.setupPreview();
  },

  setupEventListeners() {
    document.getElementById('marginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.addMargin();
    });

    // Preview calculation
    document.getElementById('previewBasePrice')?.addEventListener('input', () => {
      this.calculatePreview();
    });
  },

  setupPreview() {
    this.calculatePreview();
  },

  calculatePreview() {
    const basePrice = parseFloat(document.getElementById('previewBasePrice')?.value) || 0;
    const marginText = document.getElementById('previewMargin')?.value || '10%';
    const marginValue = parseFloat(marginText.replace('%', '')) || 10;
    
    const sellPrice = Math.round(basePrice * (1 + marginValue / 100));
    
    document.getElementById('previewSellPrice').value = `Rp${sellPrice.toLocaleString('id-ID')}`;
  },

  async loadMargins() {
    const tbody = document.getElementById('marginsTableBody');
    
    try {
      // Note: Implement this endpoint in backend
      // const data = await App.request('/admin/margins');
      // this.state.margins = data.data.margins;
      
      // Mock data for demo
      this.state.margins = [
        { id: '1', category: 'pulsa', provider: null, margin_type: 'percentage', margin_value: 5, is_active: true },
        { id: '2', category: 'data', provider: 'TELKOMSEL', margin_type: 'percentage', margin_value: 8, is_active: true },
        { id: '3', category: 'pln', provider: null, margin_type: 'fixed', margin_value: 500, is_active: true },
      ];

      this.renderTable(tbody);
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-8 text-center text-red-500">
            Gagal memuat data margin
          </td>
        </tr>
      `;
    }
  },

  renderTable(tbody) {
    if (this.state.margins.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-8 text-center text-gray-500">
            <i data-lucide="percent" class="w-8 h-8 mx-auto mb-2 text-gray-300"></i>
            <p>Belum ada margin diatur</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.state.margins.map(margin => `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-6 py-4">
          <span class="font-medium text-navy-900">${this.formatCategory(margin.category)}</span>
        </td>
        <td class="px-6 py-4 text-sm text-gray-600">
          ${margin.provider || 'Semua Provider'}
        </td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
            ${margin.margin_type === 'percentage' ? 'Persentase' : 'Nominal'}
          </span>
        </td>
        <td class="px-6 py-4 font-medium">
          ${margin.margin_type === 'percentage' ? `${margin.margin_value}%` : `Rp${margin.margin_value.toLocaleString('id-ID')}`}
        </td>
        <td class="px-6 py-4">
          <span class="status-badge ${margin.is_active ? 'success' : 'failed'}">
            ${margin.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end space-x-2">
            <button onclick="MarginManagement.toggleMargin('${margin.id}', ${margin.is_active})" 
                    class="p-2 text-gray-400 hover:text-${margin.is_active ? 'red' : 'green'}-600 transition-colors">
              <i data-lucide="${margin.is_active ? 'toggle-left' : 'toggle-right'}" class="w-4 h-4"></i>
            </button>
            <button onclick="MarginManagement.deleteMargin('${margin.id}')" 
                    class="p-2 text-gray-400 hover:text-red-600 transition-colors">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    lucide.createIcons();
  },

  formatCategory(code) {
    const map = {
      'pulsa': 'Pulsa', 'data': 'Paket Data', 'pln': 'Token PLN',
      'ewallet': 'E-Wallet', 'game': 'Voucher Game', 'ppob': 'PPOB'
    };
    return map[code] || code;
  },

  async addMargin() {
    const category = document.getElementById('marginCategory').value;
    const provider = document.getElementById('marginProvider').value || null;
    const marginType = document.getElementById('marginType').value;
    const marginValue = parseFloat(document.getElementById('marginValue').value);

    if (!category || !marginValue) {
      Utils.showToast('warning', 'Validasi', 'Lengkapi semua field yang wajib');
      return;
    }

    try {
      App.showLoading(true);
      await App.request('/admin/margins', {
        method: 'POST',
        body: JSON.stringify({ category, provider, marginType, marginValue })
      });

      Utils.showToast('success', 'Berhasil', 'Margin berhasil ditambahkan');
      document.getElementById('marginForm').reset();
      this.loadMargins();
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal menambahkan margin');
    } finally {
      App.showLoading(false);
    }
  },

  async toggleMargin(marginId, currentStatus) {
    try {
      App.showLoading(true);
      // await App.request(`/admin/margins/${marginId}`, {
      //   method: 'PATCH',
      //   body: JSON.stringify({ is_active: !currentStatus })
      // });

      Utils.showToast('success', 'Berhasil', `Margin ${currentStatus ? 'dinonaktifkan' : 'diaktifkan'}`);
      this.loadMargins();
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal mengubah status margin');
    } finally {
      App.showLoading(false);
    }
  },

  async deleteMargin(marginId) {
    if (!confirm('Yakin ingin menghapus margin ini?')) return;

    try {
      App.showLoading(true);
      // await App.request(`/admin/margins/${marginId}`, { method: 'DELETE' });

      Utils.showToast('success', 'Berhasil', 'Margin dihapus');
      this.loadMargins();
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal menghapus margin');
    } finally {
      App.showLoading(false);
    }
  },

  async recalculateAll() {
    if (!confirm('Hitung ulang semua harga voucher berdasarkan margin terbaru? Proses ini mungkin memakan waktu.')) return;

    try {
      App.showLoading(true);
      const data = await App.request('/admin/prices/recalculate', { method: 'POST' });
      Utils.showToast('success', 'Berhasil', `${data.data.updated} harga diperbarui`);
    } catch (err) {
      Utils.showToast('error', 'Error', 'Gagal recalculate harga');
    } finally {
      App.showLoading(false);
    }
  }
};

window.MarginManagement = MarginManagement;