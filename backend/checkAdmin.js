require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    console.log('Connecting to:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    
    const admin = await User.findOne({ email: 'admin@fineart.com' });
    console.log('Admin found:', admin ? { email: admin.email, role: admin.role, id: admin._id } : 'NOT FOUND');
    
    if (admin && admin.role !== 'admin') {
      console.log('❌ Admin role is wrong! Fixing...');
      admin.role = 'admin';
      await admin.save();
      console.log('✅ Admin role fixed to admin');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
