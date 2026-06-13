const Dispute = require('../models/Dispute');
const Order = require('../models/Order');
const User = require('../models/User');
const { effectiveStatus } = require('../utils/orderHelpers');

const FALSE_DISPUTE_THRESHOLD = Number(process.env.FALSE_DISPUTE_THRESHOLD || 3);

exports.createDispute = async (req, res) => {
  try {
    const { orderId, reason, description } = req.body;
    if (!orderId || !reason) {
      return res.status(400).json({ message: 'orderId and reason are required.' });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: 'At least one proof image is required.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the buyer can raise a dispute.' });
    }

    const user = await User.findById(req.user._id);
    if (user.accountRestricted) {
      return res.status(403).json({ message: 'Account restricted. Contact support.' });
    }

    const st = effectiveStatus(order);
    if (st !== 'shipped') {
      return res.status(400).json({
        message: 'You can only raise an issue while the order is shipped (in transit).',
      });
    }

    const existing = await Dispute.findOne({ order: order._id });
    if (existing) {
      return res.status(400).json({ message: 'A dispute already exists for this order.' });
    }

    const imagePaths = files.map((f) => `uploads/${f.filename}`);

    const dispute = await Dispute.create({
      order: order._id,
      buyer: order.buyer,
      artist: order.artist,
      reason: String(reason).trim(),
      description: description ? String(description).trim() : '',
      images: imagePaths,
      status: 'open',
    });

    order.status = 'dispute';
    order.payoutBlocked = true;
    order.activeDispute = dispute._id;
    await order.save();

    const populated = await Dispute.findById(dispute._id)
      .populate('order')
      .populate('buyer', 'name email')
      .populate('artist', 'name email');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create dispute.' });
  }
};

exports.listMyDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find({ buyer: req.user._id })
      .populate('order')
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.incrementFalseDisputeCount = async (buyerId) => {
  const buyer = await User.findById(buyerId);
  if (!buyer) return;
  buyer.falseDisputeCount = (buyer.falseDisputeCount || 0) + 1;
  if (buyer.falseDisputeCount >= FALSE_DISPUTE_THRESHOLD) {
    buyer.accountFlagged = true;
    buyer.accountRestricted = true;
    buyer.restrictionReason = 'Repeated invalid disputes';
  }
  await buyer.save();
};
