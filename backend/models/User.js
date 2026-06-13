const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const schema = new mongoose.Schema(
  {
    name: String,
    phone: { type: String, default: '' },
    email: { type: String, unique: true, lowercase: true },
    password: { type: String, select: false },

    role: { type: String, enum: ['user', 'admin', 'artist', 'disabled'], default: 'user' },

    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    savedArtworks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }],

    bio: String,
    profilePic: String,

    artistApplication: {
      status: { type: String, default: null },
      bio: String,
      artStyle: String,
      portfolioUrls: [String],
      passportPhoto: String,
      appliedAt: Date,
      reviewedAt: Date,
    },

    // OTP for password reset / change password
    resetOTP: String,
    resetOTPExpiry: Date,
    changePasswordOTP: String,
    changePasswordOTPExpiry: Date,

    /** @deprecated — migrate to bankDetailsEnc; kept for DB migration reads only */
    bankDetails: {
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      name: { type: String, default: '' },
    },
    hasBankDetails: { type: Boolean, default: false },
    bankDetailsEnc: {
      iv: { type: String, default: null },
      tag: { type: String, default: null },
      data: { type: String, default: null },
    },
    /** RazorpayX contact / fund account cache for payouts */
    razorpayContactId: { type: String, default: null },
    razorpayFundAccountId: { type: String, default: null },

    falseDisputeCount: { type: Number, default: 0 },
    accountFlagged: { type: Boolean, default: false },
    accountRestricted: { type: Boolean, default: false },
    restrictionReason: { type: String, default: null },
  },
  { timestamps: true }
);

schema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

schema.methods.comparePassword = function (p) {
  return bcrypt.compare(p, this.password);
};

module.exports = mongoose.model('User', schema);