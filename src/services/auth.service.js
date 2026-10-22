const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const emailService = require('./email.service');

const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

function hashResetCode(code) {
  const secret = process.env.RESET_CODE_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('RESET_CODE_SECRET or JWT_SECRET must be configured');
  }

  return crypto.createHmac('sha256', secret).update(code).digest('hex');
}

function requestAccepted() {
  return { message: 'If an account exists for that email, reset instructions will be sent.' };
}

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

async function register({ name, email, password, confirmPassword }) {
  if (!name?.trim() || !email?.trim() || !password || !confirmPassword) {
    const error = new Error('Name, email, password, and password confirmation are required');
    error.status = 400;
    throw error;
  }
  if (password !== confirmPassword) {
    const error = new Error('Passwords do not match');
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

    try {
      await emailService.sendWelcomeEmail(user);
    } catch (error) {
      console.error('Welcome email could not be sent:', error.message);
    }

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

async function requestPasswordReset({ email }) {
  if (!email?.trim()) {
    const error = new Error('Email is required');
    error.status = 400;
    throw error;
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    return requestAccepted();
  }

  const code = crypto.randomInt(0, 100_000_000).toString().padStart(8, '0');
  user.resetPasswordCodeHash = hashResetCode(code);
  user.resetPasswordExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  try {
    await emailService.sendPasswordResetEmail(user, code);
  } catch (error) {
    console.error('Password reset email could not be sent:', error.message);
  }

  return requestAccepted();
}

async function resetPassword({ email, code, password, confirmPassword }) {
  if (!email?.trim() || !code || !password || !confirmPassword) {
    const error = new Error('Email, reset code, password, and password confirmation are required');
    error.status = 400;
    throw error;
  }
  if (password !== confirmPassword) {
    const error = new Error('Passwords do not match');
    error.status = 400;
    throw error;
  }
  if (password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.status = 400;
    throw error;
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
    resetPasswordCodeHash: hashResetCode(code),
    resetPasswordExpiresAt: { $gt: new Date() },
  });
  if (!user) {
    const error = new Error('Invalid or expired reset code');
    error.status = 400;
    throw error;
  }

  user.password = await bcrypt.hash(password, 12);
  user.resetPasswordCodeHash = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  return { message: 'Password has been reset successfully' };
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

module.exports = { register, login, requestPasswordReset, resetPassword };