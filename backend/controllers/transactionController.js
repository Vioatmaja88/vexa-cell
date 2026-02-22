const { v4: uuidv4 } = require('uuid');
const digiflazzService = require('../services/digiflazzService');
const pakasirService = require('../services/pakasirService');
const priceService = require('../services/priceService');
const supabase = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

exports.createTransaction = async (req, res) => {
  try {
    const { voucherCode, targetNumber } = req.body;
    const userId = req.user.id;

    if (!voucherCode || !targetNumber) {
      return errorResponse(res, 400, 'Voucher code and target number are required');
    }

    // Get voucher details
    const {  voucher, error: voucherErr } = await supabase
      .from('vouchers')
      .select(`
        *,
        providers (provider_code, provider_name)
      `)
      .eq('voucher_code', voucherCode)
      .eq('status', true)
      .single();

    if (voucherErr || !voucher) {
      return errorResponse(res, 404, 'Voucher not found or unavailable');
    }

    // Validate target number format (basic)
    if (!/^\d{10,15}$/.test(targetNumber.replace(/\D/g, ''))) {
      return errorResponse(res, 400, 'Invalid target number format');
    }

    // Calculate prices
    const adminFee = 0; // Can be configured
    const totalAmount = voucher.price_sell + adminFee;

    // Create transaction record
    const transactionId = `TRX-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    const refId = `VEXA-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;

    const {  transaction, error: trxErr } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        voucher_id: voucher.id,
        transaction_id: transactionId,
        digiflazz_ref: refId,
        target_number: targetNumber,
        price_original: voucher.price_original,
        price_sell: voucher.price_sell,
        admin_fee: adminFee,
        total_amount: totalAmount,
        status: 'pending'
      })
      .select()
      .single();

    if (trxErr) throw trxErr;

    successResponse(res, 201, 'Transaction created', {
      transaction: {
        id: transaction.id,
        transactionId: transaction.transaction_id,
        voucher: {
          code: voucher.voucher_code,
          name: voucher.name,
          nominal: voucher.nominal,
          provider: voucher.providers?.provider_name
        },
        targetNumber: transaction.target_number,
        price: {
          original: transaction.price_original,
          sell: transaction.price_sell,
          adminFee: transaction.admin_fee,
          total: transaction.total_amount
        },
        status: transaction.status,
        createdAt: transaction.created_at
      }
    });
  } catch (err) {
    console.error('Create transaction error:', err);
    errorResponse(res, 500, 'Failed to create transaction');
  }
};

exports.processPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { email, phone } = req.body;

    // Get transaction
    const {  transaction, error: trxErr } = await supabase
      .from('transactions')
      .select('*, vouchers(voucher_code, name, nominal)')
      .eq('transaction_id', transactionId)
      .eq('user_id', req.user.id)
      .single();

    if (trxErr || !transaction) {
      return errorResponse(res, 404, 'Transaction not found');
    }

    if (transaction.status !== 'pending') {
      return errorResponse(res, 400, `Transaction already ${transaction.status}`);
    }

    // Create QRIS payment via Pakasir
    const paymentResult = await pakasirService.createQRIS({
      orderId: transaction.transaction_id,
      amount: transaction.total_amount,
      customerEmail: email || req.user.email,
      customerPhone: phone || req.user.phone,
      expiryMinutes: 30
    });

    // Save payment record
    const { error: payErr } = await supabase
      .from('payments')
      .insert({
        transaction_id: transaction.id,
        payment_method: 'qris',
        pakasir_order_id: paymentResult.data.orderId,
        qr_string: paymentResult.data.qrString,
        qr_image_url: paymentResult.data.qrImageUrl,
        amount: transaction.total_amount,
        status: 'pending'
      });

    if (payErr) throw payErr;

    // Update transaction status
    await supabase
      .from('transactions')
      .update({ status: 'processing' })
      .eq('id', transaction.id);

    successResponse(res, 200, 'Payment QRIS generated', {
      payment: {
        orderId: paymentResult.data.orderId,
        qrString: paymentResult.data.qrString,
        qrImageUrl: paymentResult.data.qrImageUrl,
        amount: paymentResult.data.amount,
        expiryTime: paymentResult.data.expiryTime
      },
      transaction: {
        id: transaction.id,
        transactionId: transaction.transaction_id,
        status: 'processing'
      }
    });
  } catch (err) {
    console.error('Process payment error:', err);
    errorResponse(res, 500, 'Failed to process payment');
  }
};

exports.checkTransactionStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const {  transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        vouchers (voucher_code, name, nominal, providers(provider_name)),
        payments (status as payment_status, qr_image_url)
      `)
      .eq('transaction_id', transactionId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !transaction) {
      return errorResponse(res, 404, 'Transaction not found');
    }

    // If still processing, check with Digiflazz
    if (['pending', 'processing'].includes(transaction.status)) {
      try {
        const digiStatus = await digiflazzService.checkStatus(transaction.digiflazz_ref);
        const newStatus = digiStatus.data?.status?.toLowerCase() || 'pending';
        
        // Update if status changed
        if (newStatus !== transaction.status) {
          await supabase
            .from('transactions')
            .update({
              status: newStatus,
              message: digiStatus.data?.message,
              sn: digiStatus.data?.sn,
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.id);
          
          transaction.status = newStatus;
          transaction.message = digiStatus.data?.message;
          transaction.sn = digiStatus.data?.sn;
        }
      } catch (digiErr) {
        console.log('Status check skipped:', digiErr.message);
      }
    }

    successResponse(res, 200, 'Transaction status retrieved', {
      transaction: {
        id: transaction.id,
        transactionId: transaction.transaction_id,
        voucher: {
          code: transaction.vouchers?.voucher_code,
          name: transaction.vouchers?.name,
          nominal: transaction.vouchers?.nominal,
          provider: transaction.vouchers?.providers?.provider_name
        },
        targetNumber: transaction.target_number,
        totalAmount: transaction.total_amount,
        status: transaction.status,
        message: transaction.message,
        serialNumber: transaction.sn,
        paymentStatus: transaction.payments?.status,
        qrImageUrl: transaction.payments?.qr_image_url,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at
      }
    });
  } catch (err) {
    console.error('Check status error:', err);
    errorResponse(res, 500, 'Failed to check transaction status');
  }
};

exports.getUserTransactions = async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        vouchers (name, nominal, providers(provider_name, logo_url))
      `, { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    successResponse(res, 200, 'Transactions retrieved', {
      transactions: data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    errorResponse(res, 500, 'Failed to fetch transactions');
  }
};