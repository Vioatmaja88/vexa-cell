const pakasirService = require('../services/pakasirService');
const digiflazzService = require('../services/digiflazzService');
const supabase = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data: payment, error } = await supabase
      .from('payments')
      .select('*, transactions(transaction_id, status)')
      .eq('pakasir_order_id', orderId)
      .single();

    if (error || !payment) {
      return errorResponse(res, 404, 'Payment not found');
    }

    // Check with Pakasir for latest status
    const pakasirStatus = await pakasirService.checkPaymentStatus(orderId);

    // Update if changed
    if (pakasirStatus.data.status !== payment.status) {
      await supabase
        .from('payments')
        .update({
          status: pakasirStatus.data.status,
          paid_at: pakasirStatus.data.paidAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      // If paid, trigger voucher fulfillment
      if (pakasirStatus.data.status === 'paid' && payment.transactions?.status === 'processing') {
        await this.fulfillVoucher(payment.transactions.id);
      }
    }

    successResponse(res, 200, 'Payment status retrieved', {
      payment: {
        orderId: payment.pakasir_order_id,
        status: pakasirStatus.data.status,
        amount: payment.amount,
        paidAt: payment.paid_at
      }
    });
  } catch (err) {
    console.error('Get payment status error:', err);
    errorResponse(res, 500, 'Failed to get payment status');
  }
};

exports.handlePakasirWebhook = async (webhookData) => {
  try {
    const { orderId, status, paid_at, ...metadata } = webhookData;

    console.log('🔔 Pakasir webhook received:', { orderId, status });

    // Find payment
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*, transactions(id, status, digiflazz_ref, voucher_id, target_number)')
      .eq('pakasir_order_id', orderId)
      .single();

    if (error || !payment) {
      console.warn('Webhook: Payment not found for order', orderId);
      return { received: true, warning: 'Payment not found' };
    }

    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: pakasirService.mapStatus(status),
        paid_at: paid_at || new Date().toISOString(),
        webhook_metadata: metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    // If payment successful and transaction pending/processing, fulfill voucher
    if (status === 'paid' && ['pending', 'processing'].includes(payment.transactions?.status)) {
      await this.fulfillVoucher(payment.transactions.id);
    }

    return { received: true, processed: true };
  } catch (err) {
    console.error('Webhook processing error:', err);
    throw err;
  }
};

exports.fulfillVoucher = async (transactionId) => {
  try {
    // Get transaction details
    const { data: transaction, error: trxErr } = await supabase
      .from('transactions')
      .select('*, vouchers(voucher_code)')
      .eq('id', transactionId)
      .single();

    if (trxErr || !transaction) {
      throw new Error('Transaction not found for fulfillment');
    }

    // Call Digiflazz to buy voucher
    const digiResult = await digiflazzService.buyVoucher({
      customerNo: transaction.target_number,
      buyerSkuCode: transaction.vouchers.voucher_code,
      refId: transaction.digiflazz_ref
    });

    const digiStatus = digiResult.data?.status?.toLowerCase() || 'pending';
    const digiMessage = digiResult.data?.message || '';
    const digiSn = digiResult.data?.sn;

    // Update transaction
    const updateData = {
      status: digiStatus,
      message: digiMessage,
      updated_at: new Date().toISOString()
    };
    if (digiSn) updateData.sn = digiSn;

    await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId);

    // Create receipt if successful
    if (digiStatus === 'success') {
      await this.createReceipt(transactionId, {
        serialNumber: digiSn,
        digiflazzResponse: digiResult.data
      });
    }

    console.log(`✅ Voucher fulfillment: ${transactionId} -> ${digiStatus}`);
    return { success: true, status: digiStatus };
  } catch (err) {
    console.error('Fulfillment error:', err);

    // Update transaction as failed
    await supabase
      .from('transactions')
      .update({
        status: 'failed',
        message: `Fulfillment error: ${err.message}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    throw err;
  }
};

exports.createReceipt = async (transactionId, extraData = {}) => {
  try {
    const { data: transaction } = await supabase
      .from('transactions')
      .select(`
        *,
        users (email, full_name, phone),
        vouchers (name, nominal, providers(provider_name))
      `)
      .eq('id', transactionId)
      .single();

    if (!transaction) return null;

    const receiptNumber = `RCP-${Date.now()}-${transaction.transaction_id.slice(-8)}`;
    const receiptData = {
      receiptNumber,
      merchant: 'Vexa Cell',
      date: new Date().toISOString(),
      transaction: {
        id: transaction.transaction_id,
        voucher: {
          name: transaction.vouchers.name,
          nominal: transaction.vouchers.nominal,
          provider: transaction.vouchers.providers?.provider_name
        },
        targetNumber: transaction.target_number,
        serialNumber: extraData.serialNumber || transaction.sn,
        pricing: {
          original: transaction.price_original,
          sell: transaction.price_sell,
          adminFee: transaction.admin_fee,
          total: transaction.total_amount
        },
        status: transaction.status
      },
      customer: {
        name: transaction.users?.full_name,
        email: transaction.users?.email,
        phone: transaction.users?.phone
      },
      meta: extraData.digiflazzResponse || {}
    };

    const { data: receipt, error } = await supabase
      .from('receipts')
      .insert({
        transaction_id: transactionId,
        receipt_number: receiptNumber,
        receipt_data: receiptData
      })
      .select()
      .single();

    if (error) throw error;
    return receipt;
  } catch (err) {
    console.error('Create receipt error:', err);
    return null;
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const { data: receipt, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (error || !receipt) {
      // Try to generate if not exists and transaction is successful
      const { data: transaction } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('transaction_id', transactionId)
        .single();

      if (transaction?.status === 'success') {
        const newReceipt = await this.createReceipt(transaction.id);
        if (newReceipt) {
          return successResponse(res, 200, 'Receipt generated', { receipt: newReceipt });
        }
      }
      return errorResponse(res, 404, 'Receipt not found');
    }

    successResponse(res, 200, 'Receipt retrieved', { receipt });
  } catch (err) {
    console.error('Get receipt error:', err);
    errorResponse(res, 500, 'Failed to fetch receipt');
  }
};
