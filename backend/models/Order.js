const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  artwork: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
});

const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'shipped',
  'delivered',
  'dispute',
  'under_review',
  'refunded',
  'partial_refund',
  'cancelled',
  'pending',
  'confirmed',
];

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    artwork: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork', required: true },
    total: { type: Number, min: 0, default: 0 },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    items: [orderItemSchema],
    subtotalAmount: { type: Number, required: true, min: 0, default: 0 },
    platformFeeAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    grandTotalAmount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending_payment',
    },
    trackingId: { type: String, default: null },
    courier: { type: String, default: null },
    courierId: { type: String, default: null },
    /** Courier / carrier tracking status for anti-fraud (e.g. DELIVERED, IN_TRANSIT) */
    courierTrackingStatus: { type: String, default: 'UNKNOWN' },
    /** Artist shipment proof image paths (relative to server), mandatory to mark shipped */
    proofImages: [{ type: String }],

    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed'], default: 'unpaid' },
    paymentProvider: { type: String, default: 'razorpay' },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    deliveredAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    /** Buyer must confirm or dispute before this (set when status = shipped) */
    autoDeliverAt: { type: Date, default: null },

    payoutBlocked: { type: Boolean, default: false },
    payoutReleased: { type: Boolean, default: false },
    activeDispute: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispute', default: null },
    partialRefundAmount: { type: Number, default: null },

    deliveryOTP: { type: String, default: null },
    deliveryOTPExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
