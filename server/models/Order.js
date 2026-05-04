const mongoose = require('mongoose');

// Token counter schema for daily reset
const tokenCounterSchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    unique: true,
  },
  count: {
    type: Number,
    default: 0,
  },
});

const TokenCounter = mongoose.model('TokenCounter', tokenCounterSchema);

// Order item sub-schema
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: { type: String, required: true }, // Snapshot at time of order
  productPrice: { type: Number, required: true }, // Snapshot at time of order
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  subtotal: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
  billId: {
    type: String,
    required: true,
    unique: true,
  },
  tokenNumber: {
    type: Number,
    required: true,
  },
  tokenDate: {
    type: String, // YYYY-MM-DD - used with tokenNumber for uniqueness
    required: true,
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  tax: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'cancelled'],
    default: 'pending',
  },
  customerName: {
    type: String,
    trim: true,
  },
  customerPhone: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  billedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  deliveredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  deliveredAt: {
    type: Date,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'other'],
    default: 'cash',
  },
}, {
  timestamps: true,
});

// Compound index for token uniqueness per day
orderSchema.index({ tokenNumber: 1, tokenDate: 1 }, { unique: true });
orderSchema.index({ status: 1, createdAt: -1 });

// Static: Get next token number for today
orderSchema.statics.getNextToken = async function () {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const counter = await TokenCounter.findOneAndUpdate(
    { date: today },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );
  return { tokenNumber: counter.count, tokenDate: today };
};

// Static: Generate unique bill ID
orderSchema.statics.generateBillId = function () {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `BILL-${timestamp}-${random}`;
};

module.exports = mongoose.model('Order', orderSchema);
module.exports.TokenCounter = TokenCounter;
