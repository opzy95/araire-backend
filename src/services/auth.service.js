const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

function createToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be configured');
  }

  return jwt.sign({ sub: userId.toString() }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function register({ name, email, password }) {
  if (!name?.trim() || !email?.trim() || !password) {
    const error = new Error('Name, email, and password are required');
    error.status = 400;
    throw error;
  }
  if (password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.status = 400;
    throw error;
  }

  try {
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: await bcrypt.hash(password, 12),
    });

    return { user: publicUser(user), token: createToken(user._id) };
  } catch (error) {
    if (error.code === 11000) {
      const conflict = new Error('An account with this email already exists');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
}

async function login({ email, password }) {
  if (!email?.trim() || !password) {
    const error = new Error('Email and password are required');
    error.status = 400;
    throw error;
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  return { user: publicUser(user), token: createToken(user._id) };
}

module.exports = { register, login };