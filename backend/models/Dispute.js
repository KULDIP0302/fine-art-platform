const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    description: { type: String, default: '' },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved'],
      default: 'open',
    },
    buyerProofStrong: { type: Boolean, default: false },
    adminDecision: { type: String, default: null },
    adminNotes: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dispute', disputeSchema);
