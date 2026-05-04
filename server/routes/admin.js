const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const Log = require('../models/Log');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { createLog } = require('../utils/logger');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

/**
 * GET /api/admin/dashboard
 * Dashboard statistics
 */
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parallel queries for performance
    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      dailySales,
      weeklySales,
      monthlySales,
      recentOrders,
      salesByDay,
    ] = await Promise.all([
      Order.countDocuments({ status: { $ne: 'cancelled' } }),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'delivered' }),

      // Daily sales total
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // Weekly sales total
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // Monthly sales total
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // Recent 10 orders
      Order.find()
        .populate('billedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(10),

      // Last 7 days sales for chart
      Order.aggregate([
        {
          $match: {
            status: { $ne: 'cancelled' },
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            total: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      stats: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        dailySales: dailySales[0]?.total || 0,
        dailyOrders: dailySales[0]?.count || 0,
        weeklySales: weeklySales[0]?.total || 0,
        weeklyOrders: weeklySales[0]?.count || 0,
        monthlySales: monthlySales[0]?.total || 0,
        monthlyOrders: monthlySales[0]?.count || 0,
      },
      recentOrders,
      salesByDay,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * POST /api/admin/users
 * Create new user
 */
router.post('/users', validate(schemas.createUser), async (req, res) => {
  try {
    const user = await User.create(req.body);

    await createLog({
      user: req.user,
      action: 'CREATE_USER',
      resource: 'User',
      resourceId: user._id,
      details: { name: user.name, role: user.role },
      req,
    });

    res.status(201).json({ user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user
 */
router.put('/users/:id', validate(schemas.updateUser), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent self-deactivation
    if (req.params.id === req.user.id.toString() && req.body.isActive === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    Object.assign(user, req.body);
    await user.save();

    await createLog({
      user: req.user,
      action: 'UPDATE_USER',
      resource: 'User',
      resourceId: user._id,
      details: req.body,
      req,
    });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Soft-delete user (deactivate)
 */
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await createLog({
      user: req.user,
      action: 'DELETE_USER',
      resource: 'User',
      resourceId: user._id,
      details: { name: user.name },
      req,
    });

    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * GET /api/admin/logs
 * Audit logs
 */
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const query = action ? { action } : {};

    const logs = await Log.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Log.countDocuments(query);

    res.json({ logs, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * GET /api/admin/export/orders
 * Export orders as CSV
 */
router.get('/export/orders', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
    }

    const orders = await Order.find(query)
      .populate('billedBy', 'name')
      .populate('deliveredBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10000);

    // Generate CSV
    const headers = ['Bill ID', 'Token', 'Date', 'Customer', 'Items', 'Subtotal', 'Tax', 'Discount', 'Total', 'Status', 'Payment', 'Billed By', 'Delivered By', 'Delivered At'];

    const rows = orders.map((o) => [
      o.billId,
      o.tokenNumber,
      new Date(o.createdAt).toLocaleString(),
      o.customerName || '',
      o.items.map((i) => `${i.productName} x${i.quantity}`).join('; '),
      o.subtotal,
      o.tax,
      o.discount,
      o.total,
      o.status,
      o.paymentMethod,
      o.billedBy?.name || '',
      o.deliveredBy?.name || '',
      o.deliveredAt ? new Date(o.deliveredAt).toLocaleString() : '',
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

    await createLog({ user: req.user, action: 'EXPORT_REPORT', req });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-export-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router;
