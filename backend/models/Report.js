const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    artwork: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
