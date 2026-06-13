const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    commissionAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'processed', 'failed', 'cancelled'],
      default: 'pending',
    },
    razorpayPayoutId: { type: String, default: null },
    transactionId: { type: String, default: null },
    razorpayFundAccountId: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

payoutSchema.index({ order: 1 }, { unique: true });

module.exports = mongoose.model('Payout', payoutSchema);
