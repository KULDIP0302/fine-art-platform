const User = require('../models/User');

const DEFAULT_ADMIN = {
  name: 'Admin',
  email: 'admin@fineart.com',
  password: 'admin123',
  role: 'admin',
};

const seedAdmin = async () => {
  try {
    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      console.log('Admin user already exists.');
      return;
    }
    const existingByEmail = await User.findOne({ email: DEFAULT_ADMIN.email }).select('+password');
    if (existingByEmail) {
      existingByEmail.name = DEFAULT_ADMIN.name;
      existingByEmail.role = 'admin';
      existingByEmail.password = DEFAULT_ADMIN.password;
      await existingByEmail.save();
      console.log('Existing account promoted to admin:', DEFAULT_ADMIN.email, '/', DEFAULT_ADMIN.password);
      return;
    }

    await User.create(DEFAULT_ADMIN);
    console.log('Default admin created:', DEFAULT_ADMIN.email, '/', DEFAULT_ADMIN.password);
  } catch (err) {
    if (err.code === 11000) {
      console.log('Default admin email already in use. Use existing admin or change email in scripts/seedAdmin.js');
    } else {
      console.error('Seed admin error:', err.message);
    }
  }
};

module.exports = seedAdmin;
