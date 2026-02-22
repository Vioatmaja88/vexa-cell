const jwt = require('jsonwebtoken');
const supabase = require('../config/database');
const { errorResponse } = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Authentication required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user exists and is active
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, is_active, is_admin')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.is_active) {
      return errorResponse(res, 401, 'Invalid or inactive user');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return errorResponse(res, 401, 'Invalid token');
    }
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Token expired');
    }
    console.error('Auth middleware error:', err);
    return errorResponse(res, 500, 'Authentication error');
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin) {
    return errorResponse(res, 403, 'Admin access required');
  }
  next();
};

module.exports = { authenticate, requireAdmin };