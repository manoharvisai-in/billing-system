const Joi = require('joi');

/**
 * Generic validation middleware factory
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  next();
};

// Auth schemas
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  createUser: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'billing', 'delivery').required(),
  }),

  updateUser: Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email(),
    password: Joi.string().min(6),
    role: Joi.string().valid('admin', 'billing', 'delivery'),
    isActive: Joi.boolean(),
  }),

  createProduct: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    price: Joi.number().min(0).required(),
    category: Joi.string().min(1).required(),
    stock: Joi.number().min(0).default(0),
    barcode: Joi.string().optional().allow(''),
    description: Joi.string().max(500).optional().allow(''),
  }),

  updateProduct: Joi.object({
    name: Joi.string().min(1).max(200),
    price: Joi.number().min(0),
    category: Joi.string().min(1),
    stock: Joi.number().min(0),
    barcode: Joi.string().optional().allow(''),
    description: Joi.string().max(500).optional().allow(''),
    isActive: Joi.boolean(),
  }),

  createOrder: Joi.object({
    items: Joi.array().items(
      Joi.object({
        product: Joi.string().required(),
        productName: Joi.string().required(),
        productPrice: Joi.number().min(0).required(),
        quantity: Joi.number().min(1).required(),
        subtotal: Joi.number().min(0).required(),
      })
    ).min(1).required(),
    subtotal: Joi.number().min(0).required(),
    tax: Joi.number().min(0).default(0),
    discount: Joi.number().min(0).default(0),
    total: Joi.number().min(0).required(),
    customerName: Joi.string().optional().allow(''),
    customerPhone: Joi.string().optional().allow(''),
    notes: Joi.string().optional().allow(''),
    paymentMethod: Joi.string().valid('cash', 'card', 'upi', 'other').default('cash'),
  }),
};

module.exports = { validate, schemas };
