const crypto = require('crypto');

// Verify Pakasir webhook signature
exports.verifyPakasirWebhook = (req, res, next) => {
  try {
    const signature = req.headers['x-pakasir-signature'];
    const payload = JSON.stringify(req.body);
    const secret = process.env.PAKASIR_WEBHOOK_SECRET;

    if (!signature || !secret) {
      // Skip verification in development
      if (process.env.NODE_ENV === 'development') {
        return next();
      }
      return res.status(401).json({ error: 'Missing webhook signature' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Webhook signature mismatch');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  } catch (err) {
    console.error('Webhook verification error:', err);
    return res.status(500).json({ error: 'Webhook verification failed' });
  }
};