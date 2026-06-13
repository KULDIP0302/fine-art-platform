const mongoose = require('mongoose');

const artworkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['active', 'under_review', 'copyright_strike'],
      default: 'active',
    },
    sellingDisabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Artwork', artworkSchema);
