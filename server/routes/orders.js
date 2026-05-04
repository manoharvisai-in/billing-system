const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { createLog } = require('../utils/logger');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/orders
 * Get orders with filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      status, page = 1, limit = 50,
      startDate, endDate, search,
    } = req.query;

    const query = {};

    // Delivery staff only sees their relevant orders
    if (req.user.role === 'delivery') {
      query.status = { $in: ['pending', 'delivered'] };
    } else if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
    }

    if (search) {
      query.$or = [
        { billId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { tokenNumber: parseInt(search) || -1 },
      ];
    }

    const orders = await Order.find(query)
      .populate('billedBy', 'name email')
      .populate('deliveredBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({ orders, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * GET /api/orders/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('billedBy', 'name email')
      .populate('deliveredBy', 'name email');

    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * POST /api/orders
 * Billing staff + admin: Create new order/bill
 */
router.post('/', authorize('admin', 'billing'), validate(schemas.createOrder), async (req, res) => {
  try {
    // Get next token for today
    const { tokenNumber, tokenDate } = await Order.getNextToken();
    const billId = Order.generateBillId();

    const order = await Order.create({
      ...req.body,
      billId,
      tokenNumber,
      tokenDate,
      billedBy: req.user._id,
    });

    // Update stock for each product
    for (const item of req.body.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    await order.populate('billedBy', 'name email');

    await createLog({
      user: req.user,
      action: 'CREATE_ORDER',
      resource: 'Order',
      resourceId: order._id,
      details: { billId, tokenNumber, total: order.total },
      req,
    });

    // Emit to all relevant rooms
    const io = req.app.get('io');
    io.to('admin').emit('new_order', order);
    io.to('delivery').emit('new_order', order);

    res.status(201).json({ order });
  } catch (error) {
    console.error('Create order error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Duplicate bill ID or token. Please try again.' });
    }
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * PATCH /api/orders/:id/deliver
 * Delivery staff: Mark order as delivered
 */
router.patch('/:id/deliver', authorize('admin', 'delivery'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'delivered') {
      return res.status(400).json({ error: 'Order already delivered' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot deliver a cancelled order' });
    }

    order.status = 'delivered';
    order.deliveredBy = req.user._id;
    order.deliveredAt = new Date();
    await order.save();

    await order.populate('billedBy deliveredBy', 'name email');

    await createLog({
      user: req.user,
      action: 'MARK_DELIVERED',
      resource: 'Order',
      resourceId: order._id,
      details: { billId: order.billId },
      req,
    });

    const io = req.app.get('io');
    io.to('admin').emit('order_updated', order);
    io.to('delivery').emit('order_updated', order);

    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

/**
 * PATCH /api/orders/:id/cancel
 * Admin only: Cancel order
 */
router.patch('/:id/cancel', authorize('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot cancel a delivered order' });
    }

    order.status = 'cancelled';
    await order.save();

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    await createLog({
      user: req.user,
      action: 'CANCEL_ORDER',
      resource: 'Order',
      resourceId: order._id,
      details: { billId: order.billId },
      req,
    });

    req.app.get('io').to('admin').emit('order_updated', order);
    req.app.get('io').to('delivery').emit('order_updated', order);

    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;
