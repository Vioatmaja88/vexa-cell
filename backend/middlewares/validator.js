// Joi Validation Middleware
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.reduce((acc, detail) => {
      acc[detail.context.key] = detail.message;
      return acc;
    }, {});
    return require('../utils/response').validationResponse(res, errors);
  }

  req.body = value;
  next();
};

module.exports = { validate };