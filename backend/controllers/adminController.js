const supabase = require('../config/database');
const priceService = require('../services/priceService');
const { successResponse, errorResponse } = require('../utils/response');

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total transactions
    const { count: totalTrx } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    // Success transactions
    const { count: successTrx } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'success');

    // Today's sales
    const { data: todaySales } = await supabase
      .from('transactions')
      .select('total_amount')
      .eq('status', 'success')
      .gte('created_at', today.toISOString());

    const todayTotal = todaySales?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

    // Total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    successResponse(res, 200, 'Dashboard stats retrieved', {
      stats: {
        totalTransactions: totalTrx || 0,
        successTransactions: successTrx || 0,
        todaySales: todayTotal,
        totalUsers: totalUsers || 0,
        successRate: totalTrx ? Math.round((successTrx / totalTrx) * 100) : 0
      }
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    errorResponse(res, 500, 'Failed to fetch dashboard stats');
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { search, status, limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, full_name, phone, balance, is_active, is_admin, created_at', { count: 'exact' })
      .neq('is_admin', true) // Exclude other admins
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
    if (status !== undefined) {
      query = query.eq('is_active', status === 'active');
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    successResponse(res, 200, 'Users retrieved', {
      users: data,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
    });
  } catch (err) {
    console.error('Get users error:', err);
    errorResponse(res, 500, 'Failed to fetch users');
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete: deactivate user
    const { error } = await supabase
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .neq('is_admin', true); // Prevent deleting admins

    if (error) throw error;

    successResponse(res, 200, 'User deactivated successfully');
  } catch (err) {
    console.error('Delete user error:', err);
    errorResponse(res, 500, 'Failed to deactivate user');
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { status, userId, dateFrom, dateTo, limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        users (email, full_name),
        vouchers (name, nominal, providers(provider_name))
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (userId) query = query.eq('user_id', userId);
    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) query = query.lte('created_at', new Date(dateTo).toISOString());

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    successResponse(res, 200, 'Transactions retrieved', {
      transactions: data,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
    });
  } catch (err) {
    console.error('Get admin transactions error:', err);
    errorResponse(res, 500, 'Failed to fetch transactions');
  }
};

exports.updateTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    const validStatuses = ['pending', 'processing', 'success', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, 400, 'Invalid status value');
    }

    const { error } = await supabase
      .from('transactions')
      .update({
        status,
        message: message || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // If marked as success, ensure receipt exists
    if (status === 'success') {
      const paymentController = require('./paymentController');
      await paymentController.createReceipt(id);
    }

    successResponse(res, 200, 'Transaction status updated');
  } catch (err) {
    console.error('Update transaction error:', err);
    errorResponse(res, 500, 'Failed to update transaction');
  }
};

exports.updateMargin = async (req, res) => {
  try {
    const { category, providerCode, marginType, marginValue, isActive } = req.body;

    if (!category || marginValue === undefined) {
      return errorResponse(res, 400, 'Category and margin value are required');
    }

    const result = await priceService.updateMargin({
      category,
      providerCode: providerCode || null,
      marginType,
      marginValue: parseFloat(marginValue),
      isActive: isActive !== false
    });

    // Recalculate affected vouchers
    await priceService.recalculateAllPrices();

    successResponse(res, 200, 'Margin updated successfully', { margin: result });
  } catch (err) {
    console.error('Update margin error:', err);
    errorResponse(res, 500, 'Failed to update margin');
  }
};

exports.recalculatePrices = async (req, res) => {
  try {
    const result = await priceService.recalculateAllPrices();
    successResponse(res, 200, 'Prices recalculated', result);
  } catch (err) {
    console.error('Recalculate prices error:', err);
    errorResponse(res, 500, 'Failed to recalculate prices');
  }
};