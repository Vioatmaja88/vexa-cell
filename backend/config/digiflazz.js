const crypto = require('crypto');

const generateSign = (username, apiKey) => {
  return crypto.createHash('md5').update(username + apiKey).digest('hex');
};

const digiflazzConfig = {
  baseURL: process.env.DIGIFLAZZ_BASE_URL || 'https://digiflazz.com/api',
  username: process.env.DIGIFLAZZ_USERNAME,
  apiKey: process.env.DIGIFLAZZ_API_KEY,
  
  getSign() {
    return generateSign(this.username, this.apiKey);
  },
  
  getAuthParams() {
    return {
      username: this.username,
      sign: this.getSign(),
      deploy: 'production'
    };
  }
};

module.exports = digiflazzConfig;