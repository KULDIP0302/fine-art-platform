require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');

const createAdmin = async () => {
  try {
    console.log('Connecting to MongoDB:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const existing = await User.findOne({ email: 'admin@fineart.com' });
    if (existing) {
      console.log('✅ Admin user already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      name: 'Admin',
      email: 'admin@fineart.com',
      password: hashedPassword,
      role: 'admin',
    });

    await admin.save();
    console.log('✅ Admin user created: admin@fineart.com / admin123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

createAdmin();
