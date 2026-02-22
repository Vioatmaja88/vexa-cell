const supabase = require('../config/database');

class PriceService {
  async getMargin(category, providerCode = null) {
    // Try provider-specific margin first
    let query = supabase
      .from('price_margins')
      .select('*')
      .eq('is_active', true)
      .eq('category', category);

    if (providerCode) {
      query = query.eq('provider_code', providerCode);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1).single();

    if (error || !data) {
      // Fallback to category-only margin
      const { data: fallback, error: fallbackErr } = await supabase
        .from('price_margins')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .is('provider_code', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fallbackErr || !fallback) {
        // Default margin: 5%
        return { type: 'percentage', value: 5 };
      }
      return { type: fallback.margin_type, value: fallback.margin_value };
    }

    return { type: data.margin_type, value: data.margin_value };
  }

  calculateSellingPrice(originalPrice, margin) {
    if (margin.type === 'percentage') {
      return Math.round(originalPrice * (1 + margin.value / 100));
    }
    return Math.round(originalPrice + margin.value);
  }

  async updateMargin({ category, providerCode, marginType, marginValue, isActive = true }) {
    const { data, error } = await supabase
      .from('price_margins')
      .upsert({
        category,
        provider_code: providerCode || null,
        margin_type: marginType,
        margin_value: marginValue,
        is_active: isActive,
        updated_at: new Date().toISOString()
      }, { onConflict: 'category,provider_code' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async recalculateAllPrices() {
    const { data: vouchers, error } = await supabase
      .from('vouchers')
      .select('*, providers(provider_code)')
      .eq('status', true);

    if (error) throw error;

    for (const voucher of vouchers) {
      const margin = await this.getMargin(voucher.category, voucher.providers?.provider_code);
      const newPrice = this.calculateSellingPrice(voucher.price_original, margin);

      await supabase
        .from('vouchers')
        .update({
          price_sell: newPrice,
          margin: margin.value,
          updated_at: new Date().toISOString()
        })
        .eq('id', voucher.id);
    }

    return { success: true, updated: vouchers.length };
  }
}

module.exports = new PriceService();