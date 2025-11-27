const Joi = require('joi');
const { AppError } = require('./errorHandler');

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { 
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      return next(new AppError(errorMessage, 400));
    }

    next();
  };
};

// Common validation schemas
const schemas = {
  // User validation
  userSignup: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    first_name: Joi.string().max(50).optional(),
    last_name: Joi.string().max(50).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional()
  }),

  userLogin: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),

  // Debt validation
  debtCreate: Joi.object({
    debtor_name: Joi.string().min(2).max(255).required(),
    debtor_email: Joi.string().email().optional().allow(''),
    debtor_phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
    amount: Joi.number().positive().precision(2).required(),
    description: Joi.string().max(1000).optional().allow(''),
    category: Joi.string().max(50).optional().allow(''),
    due_date: Joi.date().iso().required(),
    reference_number: Joi.string().max(255).optional().allow(''),
    interest_rate: Joi.number().min(0).max(100).precision(2).default(0),
    payment_terms: Joi.string().max(100).optional().allow(''),
    notes: Joi.string().max(1000).optional().allow('')
  }),

  debtUpdate: Joi.object({
    debtor_name: Joi.string().min(2).max(255).optional(),
    debtor_email: Joi.string().email().optional().allow(''),
    debtor_phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
    amount: Joi.number().positive().precision(2).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    category: Joi.string().max(50).optional().allow(''),
    due_date: Joi.date().iso().optional(),
    reference_number: Joi.string().max(255).optional().allow(''),
    interest_rate: Joi.number().min(0).max(100).precision(2).optional(),
    payment_terms: Joi.string().max(100).optional().allow(''),
    notes: Joi.string().max(1000).optional().allow(''),
    status: Joi.string().valid('active', 'paid', 'cancelled').optional()
  }),

  // Credit validation
  creditCreate: Joi.object({
    creditor_name: Joi.string().min(2).max(255).required(),
    amount: Joi.number().positive().precision(2).required(),
    credit_limit: Joi.number().positive().precision(2).optional(),
    category: Joi.string().valid('accounts_payable', 'credit_line', 'vendor_credit', 'loan').required(),
    description: Joi.string().max(1000).optional().allow(''),
    interest_rate: Joi.number().min(0).max(100).precision(2).default(0)
  }),

  creditUpdate: Joi.object({
    creditor_name: Joi.string().min(2).max(255).optional(),
    amount: Joi.number().positive().precision(2).optional(),
    credit_limit: Joi.number().positive().precision(2).optional(),
    category: Joi.string().valid('accounts_payable', 'credit_line', 'vendor_credit', 'loan').optional(),
    description: Joi.string().max(1000).optional().allow(''),
    interest_rate: Joi.number().min(0).max(100).precision(2).optional(),
    status: Joi.string().valid('active', 'inactive', 'closed').optional()
  }),

  // Transaction validation
  transactionReceive: Joi.object({
    payer_name: Joi.string().min(2).max(255).required(),
    debt_id: Joi.number().integer().positive().optional(),
    amount: Joi.number().positive().precision(2).required(),
    payment_method: Joi.string().valid('cash', 'check', 'bank_transfer', 'credit_card', 'mobile_money', 'other').required(),
    description: Joi.string().max(1000).optional().allow(''),
    transaction_date: Joi.date().iso().optional(),
    reference_number: Joi.string().max(255).optional().allow('')
  }),

  transactionMake: Joi.object({
    credit_id: Joi.number().integer().positive().required(),
    amount: Joi.number().positive().precision(2).required(),
    payment_method: Joi.string().valid('cash', 'check', 'bank_transfer', 'credit_card', 'mobile_money', 'other').required(),
    description: Joi.string().max(1000).optional().allow(''),
    transaction_date: Joi.date().iso().optional(),
    reference_number: Joi.string().max(255).optional().allow('')
  }),

  // Query parameter validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }),

  // ID parameter validation
  idParam: Joi.object({
    id: Joi.number().integer().positive().required()
  })
};

// Export validation functions
module.exports = {
  validate,
  schemas
};
