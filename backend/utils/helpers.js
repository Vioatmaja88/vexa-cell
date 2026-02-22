// Utility Helper Functions

exports.formatCurrency = (amount, locale = 'id-ID') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

exports.generateRefId = (prefix = 'VEXA') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

exports.sanitizePhone = (phone) => {
  // Remove all non-digit characters, ensure starts with 0 or 62
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.substring(2);
  }
  return cleaned;
};

exports.isValidPhone = (phone) => {
  const cleaned = exports.sanitizePhone(phone);
  return /^08[0-9]{8,12}$/.test(cleaned);
};

exports.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await exports.sleep(delay * (i + 1));
    }
  }
};

exports.logger = {
  info: (msg, meta = {}) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`, meta),
  error: (msg, meta = {}) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, meta),
  warn: (msg, meta = {}) => console.warn(`[WARN] ${new Date().toISOString()} ${msg}`, meta),
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${msg}`, meta);
    }
  }
};