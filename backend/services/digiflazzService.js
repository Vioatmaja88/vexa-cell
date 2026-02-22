const axios = require('axios');
const digiflazzConfig = require('../config/digiflazz');

class DigiflazzService {
  constructor() {
    this.api = axios.create({
      baseURL: digiflazzConfig.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async request(endpoint, params = {}, method = 'POST') {
    try {
      const response = await this.api({
        method,
        url: endpoint,
        data: method === 'POST' ? { ...digiflazzConfig.getAuthParams(), ...params } : undefined,
        params: method === 'GET' ? { ...digiflazzConfig.getAuthParams(), ...params } : undefined
      });
      
      if (response.data?.status !== true && response.data?.data?.status !== 'Sukses') {
        throw new Error(response.data?.message || 'Digiflazz API error');
      }
      
      return response.data;
    } catch (error) {
      console.error('Digiflazz API Error:', error.response?.data || error.message);
      throw new Error(`Digiflazz service failed: ${error.message}`);
    }
  }

  // Get price list
  async getPriceList(category = null) {
    const params = category ? { category } : {};
    const response = await this.request('/v1/price', params);
    return response.data || response;
  }

  // Get providers
  async getProviders() {
    const response = await this.request('/v1/provider');
    return response.data || response;
  }

  // Get categories
  async getCategories() {
    const priceList = await this.getPriceList();
    const categories = [...new Set(priceList.map(item => item.category))];
    return categories.map(cat => ({
      code: cat,
      name: this.formatCategoryName(cat)
    }));
  }

  formatCategoryName(code) {
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

  // Buy voucher
  async buyVoucher({ customerNo, buyerSkuCode, refId }) {
    return await this.request('/v1/transaction', {
      customerNo,
      buyerSkuCode,
      refId
    });
  }

  // Check transaction status
  async checkStatus(refId) {
    return await this.request('/v1/transaction', { refId }, 'GET');
  }

  // Sync vouchers to database
  async syncVouchers(supabase, priceService) {
    const priceList = await this.getPriceList();
    
    for (const item of priceList) {
      // Find or create provider
      const { data: provider, error: provErr } = await supabase
        .from('providers')
        .upsert({
          provider_code: item.brand,
          provider_name: item.brand_name || item.brand,
          category: item.category,
          status: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'provider_code' })
        .select()
        .single();

      if (provErr) console.error('Provider sync error:', provErr);

      // Calculate selling price with margin
      const margin = await priceService.getMargin(item.category, item.brand);
      const priceSell = priceService.calculateSellingPrice(item.price, margin);

      // Upsert voucher
      await supabase
        .from('vouchers')
        .upsert({
          voucher_code: item.sku,
          provider_id: provider?.id,
          category: item.category,
          name: item.product_name || item.sku,
          nominal: item.nominal || '-',
          price_original: item.price,
          price_sell: priceSell,
          margin: margin.value,
          status: item.status === 'available',
          description: item.desc,
          updated_at: new Date().toISOString()
        }, { onConflict: 'voucher_code' });
    }
    
    return { success: true, synced: priceList.length };
  }
}

module.exports = new DigiflazzService();