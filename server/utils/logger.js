const Log = require('../models/Log');

/**
 * Create an audit log entry
 */
const createLog = async ({ user, action, resource, resourceId, details, req }) => {
  try {
    await Log.create({
      user: user?._id,
      userName: user?.name,
      action,
      resource,
      resourceId: resourceId?.toString(),
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
    });
  } catch (error) {
    console.error('Failed to create audit log:', error.message);
    // Don't throw - logging shouldn't break main flow
  }
};

module.exports = { createLog };
