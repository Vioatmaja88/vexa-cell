// Standardized API Response Helper
exports.successResponse = (res, statusCode, message, data = null, meta = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString()
  });
};

exports.errorResponse = (res, statusCode, message, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    errors,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: new Error().stack })
  });
};

exports.validationResponse = (res, errors) => {
  return exports.errorResponse(res, 400, 'Validation failed', errors);
};