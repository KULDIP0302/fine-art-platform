require('dotenv').config();
const connectDB = require('./config/db');
const Artwork = require('./models/Artwork');

const run = async () => {
  await connectDB();
  await Artwork.updateMany({ sellingDisabled: { $exists: false } }, { $set: { sellingDisabled: false } });
  console.log('Updated');
  process.exit();
};

run();