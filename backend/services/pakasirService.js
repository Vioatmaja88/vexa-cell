const axios = require('axios');
const pakasirConfig = require('../config/pakasir');

class PakasirService {
  constructor() {
    this.api = axios.create({
      baseURL: pakasirConfig.baseURL,
      timeout: 30000,
      headers: pakasirConfig.getHeaders()
    });
  }

  async createQRIS({ orderId, amount, customerEmail, customerPhone, expiryMinutes = 30 }) {
    try {
      const response = await this.api.post('/v1/charge', {
        merchant_id: pakasirConfig.merchantId,
        order_id: orderId,
        amount: Math.round(amount),
        payment_method: 'qris',
        customer: {
          email: customerEmail,
          phone: customerPhone
        },
        expiry: expiryMinutes,
        callback_url: `${process.env.BASE_URL}/api/payment/callback`,
        metadata: {
          source: 'vexa-cell'
        }
      });

      return {
        success: true,
        data: {
          orderId: response.data.order_id,
          qrString: response.data.qr_string,
          qrImageUrl: response.data.qr_image_url,
          amount: response.data.amount,
          expiryTime: response.data.expiry_time
        }
      };
    } catch (error) {
      console.error('Pakasir API Error:', error.response?.data || error.message);
      throw new Error(`Pakasir service failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async checkPaymentStatus(orderId) {
    try {
      const response = await this.api.get(`/v1/status/${orderId}`);
      
      return {
        success: true,
        data: {
          orderId: response.data.order_id,
          status: this.mapStatus(response.data.status),
          paidAt: response.data.paid_at,
          amount: response.data.amount
        }
      };
    } catch (error) {
      console.error('Pakasir status check error:', error.message);
      throw new Error('Failed to check payment status');
    }
  }

  mapStatus(pakasirStatus) {
    const map = {
      'pending': 'pending',
      'paid': 'paid',
      'expired': 'expired',
      'failed': 'failed',
      'cancelled': 'failed'
    };
    return map[pakasirStatus] || 'pending';
  }

  verifyWebhookSignature(payload, signature) {
    // Implement webhook signature verification if Pakasir provides it
    return true; // Placeholder
  }
}

module.exports = new PakasirService();