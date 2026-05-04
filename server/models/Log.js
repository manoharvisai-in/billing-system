const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  userName: String,
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT',
      'CREATE_ORDER', 'UPDATE_ORDER', 'CANCEL_ORDER',
      'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
      'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
      'MARK_DELIVERED', 'EXPORT_REPORT',
    ],
  },
  resource: String,
  resourceId: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
}, {
  timestamps: true,
});

logSchema.index({ createdAt: -1 });
logSchema.index({ user: 1, createdAt: -1 });
logSchema.index({ action: 1 });

module.exports = mongoose.model('Log', logSchema);
