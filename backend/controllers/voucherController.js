const digiflazzService = require('../services/digiflazzService');
const supabase = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

exports.getCategories = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vouchers')
      .select('category')
      .eq('status', true)
      .order('category');

    if (error) throw error;

    const categories = [...new Set(data.map(v => v.category))].map(cat => ({
      code: cat,
      name: digiflazzService.formatCategoryName(cat)
    }));

    successResponse(res, 200, 'Categories retrieved', { categories });
  } catch (err) {
    console.error('Get categories error:', err);
    errorResponse(res, 500, 'Failed to fetch categories');
  }
};

exports.getProviders = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = supabase
      .from('providers')
      .select('id, provider_code, provider_name, category, logo_url')
      .eq('status', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('provider_name');

    if (error) throw error;

    successResponse(res, 200, 'Providers retrieved', { providers: data });
  } catch (err) {
    console.error('Get providers error:', err);
    errorResponse(res, 500, 'Failed to fetch providers');
  }
};

exports.getList = async (req, res) => {
  try {
    const { category, provider, search, minPrice, maxPrice } = req.query;

    let query = supabase
      .from('vouchers')
      .select(`
        *,
        providers (
          provider_code,
          provider_name,
          logo_url
        )
      `)
      .eq('status', true);

    if (category) query = query.eq('category', category);
    if (provider) query = query.eq('providers.provider_code', provider);
    if (minPrice) query = query.gte('price_sell', minPrice);
    if (maxPrice) query = query.lte('price_sell', maxPrice);
    if (search) {
      query = query.or(`name.ilike.%${search}%,nominal.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('category')
      .order('price_sell')
      .range(0, 99); // Pagination

    if (error) throw error;

    successResponse(res, 200, 'Vouchers retrieved', {
      vouchers: data,
      total: count
    });
  } catch (err) {
    console.error('Get vouchers error:', err);
    errorResponse(res, 500, 'Failed to fetch vouchers');
  }
};

exports.getDetail = async (req, res) => {
  try {
    const { code } = req.params;

    const { data, error } = await supabase
      .from('vouchers')
      .select(`
        *,
        providers (
          provider_code,
          provider_name,
          logo_url
        )
      `)
      .eq('voucher_code', code)
      .eq('status', true)
      .single();

    if (error || !data) {
      return errorResponse(res, 404, 'Voucher not found');
    }

    successResponse(res, 200, 'Voucher detail retrieved', { voucher: data });
  } catch (err) {
    console.error('Get voucher detail error:', err);
    errorResponse(res, 500, 'Failed to fetch voucher detail');
  }
};

exports.syncVouchers = async (req, res) => {
  try {
    // This endpoint should be protected/admin-only
    const priceService = require('../services/priceService');
    const result = await digiflazzService.syncVouchers(supabase, priceService);
    
    successResponse(res, 200, 'Vouchers synced successfully', result);
  } catch (err) {
    console.error('Sync vouchers error:', err);
    errorResponse(res, 500, 'Failed to sync vouchers');
  }
};