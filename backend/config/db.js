const dns = require('dns');
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI?.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Atlas Connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
