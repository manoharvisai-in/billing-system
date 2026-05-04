const express = require('express');
const Product = require('../models/Product');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { createLog } = require('../utils/logger');

const router = express.Router();

// All product routes require authentication
router.use(authenticate);

/**
 * GET /api/products
 * Get all products with search and category filter
 */
router.get('/', async (req, res) => {
  try {
    const { search, category, isActive = 'true', page = 1, limit = 100 } = req.query;
    const query = {};

    if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(query)
      .sort({ category: 1, name: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Product.countDocuments(query);

    // Get distinct categories
    const categories = await Product.distinct('category', { isActive: true });

    res.json({ products, total, categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/products/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/products
 * Admin only: Create product
 */
router.post('/', authorize('admin'), validate(schemas.createProduct), async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, createdBy: req.user._id });

    await createLog({
      user: req.user,
      action: 'CREATE_PRODUCT',
      resource: 'Product',
      resourceId: product._id,
      details: { name: product.name },
      req,
    });

    // Emit real-time update
    req.app.get('io').to('admin').emit('product_updated', { action: 'created', product });

    res.status(201).json({ product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Product with this barcode already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * PUT /api/products/:id
 * Admin only: Update product
 */
router.put('/:id', authorize('admin'), validate(schemas.updateProduct), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });

    await createLog({
      user: req.user,
      action: 'UPDATE_PRODUCT',
      resource: 'Product',
      resourceId: product._id,
      details: req.body,
      req,
    });

    req.app.get('io').to('admin').emit('product_updated', { action: 'updated', product });

    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/products/:id
 * Admin only: Soft delete product
 */
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: 'Product not found' });

    await createLog({
      user: req.user,
      action: 'DELETE_PRODUCT',
      resource: 'Product',
      resourceId: product._id,
      details: { name: product.name },
      req,
    });

    req.app.get('io').to('admin').emit('product_updated', { action: 'deleted', productId: product._id });

    res.json({ message: 'Product deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
