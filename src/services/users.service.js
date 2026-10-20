const User = require('../models/user.model');

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function list() {
  const users = await User.find().sort({ createdAt: -1 });
  return users.map(publicUser);
}

async function getById(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return publicUser(user);
}

async function updateById(userId, updates) {
  const allowedUpdates = {};
  if (typeof updates.name === 'string' && updates.name.trim()) {
    allowedUpdates.name = updates.name.trim();
  }
  if (typeof updates.email === 'string' && updates.email.trim()) {
    allowedUpdates.email = updates.email.trim().toLowerCase();
  }

  try {
    const user = await User.findByIdAndUpdate(userId, allowedUpdates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return publicUser(user);
  } catch (error) {
    if (error.code === 11000) {
      const conflict = new Error('An account with this email already exists');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
}

module.exports = { list, getById, updateById };
