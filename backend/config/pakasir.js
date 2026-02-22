const pakasirConfig = {
  baseURL: process.env.PAKASIR_BASE_URL || 'https://app.pakasir.com/api',
  apiKey: process.env.PAKASIR_API_KEY,
  merchantId: process.env.PAKASIR_MERCHANT_ID,
  
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-Merchant-ID': this.merchantId
    };
  }
};

module.exports = pakasirConfig;