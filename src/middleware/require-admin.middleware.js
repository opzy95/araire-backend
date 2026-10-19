const User = require('../models/user.model');

async function requireAdmin(req, res, next) {
  const user = await User.findById(req.user.id).select('role');
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

module.exports = requireAdmin;