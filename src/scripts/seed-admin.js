require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/user.model');

async function seedAdmin() {
  const { MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGODB_URI || !ADMIN_NAME?.trim() || !ADMIN_EMAIL?.trim() || !ADMIN_PASSWORD) {
    throw new Error('MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be configured');
  }
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  await mongoose.connect(MONGODB_URI);

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existingAdmin = await User.findOne({ email });
  if (existingAdmin) {
    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      await existingAdmin.save();
    }
    console.log('Admin account is ready.');
    return;
  }

  await User.create({
    name: ADMIN_NAME.trim(),
    email,
    password: await bcrypt.hash(ADMIN_PASSWORD, 12),
    role: 'admin',
  });
  console.log('Admin account created.');
}

seedAdmin()
  .catch((error) => {
    console.error('Failed to seed admin:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });