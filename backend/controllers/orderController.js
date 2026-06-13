const mongoose = require('mongoose');
const Order = require('../models/Order');
const Artwork = require('../models/Artwork');
const { effectiveStatus, canCancel, DELIVERY_DAYS } = require('../utils/orderHelpers');

function buildOrderFilter(base, query) {
  const filter = { ...base };
  const { status, paymentStatus, from, to } = query || {};
  if (status && String(status).trim() && String(status) !== 'all') {
    filter.status = String(status).trim();
  }
  if (paymentStatus && String(paymentStatus).trim() && String(paymentStatus) !== 'all') {
    filter.paymentStatus = String(paymentStatus).trim();
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  return filter;
}

exports.create = async (req, res) => {
  try {
    const { artworkId, quantity = 1, shippingAddress } = req.body;

    if (!artworkId) return res.status(400).json({ message: 'artworkId is required.' });
    if (!shippingAddress) return res.status(400).json({ message: 'shippingAddress is required.' });

    const artwork = await Artwork.findById(artworkId);
    if (!artwork) return res.status(404).json({ message: 'Artwork not found.' });
    if (artwork.status !== 'active' || artwork.sellingDisabled) {
      return res.status(400).json({ message: 'Artwork is not available for purchase.' });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const subtotalAmount = artwork.price * qty;
    const platformFeeAmount = Math.round(subtotalAmount * 0.1);
    const grandTotalAmount = subtotalAmount + platformFeeAmount;

    const order = await Order.create({
      user: req.user._id,
      buyer: req.user._id,
      artist: artwork.artist,
      artwork: artwork._id,
      total: grandTotalAmount,
      status: 'pending_payment',
      shippingAddress,
      items: [{ artwork: artwork._id, quantity: qty, price: artwork.price }],
      subtotalAmount,
      platformFeeAmount,
      totalAmount: grandTotalAmount,
      grandTotalAmount,
      paymentStatus: 'unpaid',
    });

    const populated = await Order.findById(order._id)
      .populate('artwork', 'title image price artist')
      .populate('buyer', 'name email')
      .populate('artist', 'name email');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create order.' });
  }
};

const populateOrderItems = [
  { path: 'artwork', select: 'title image price artist' },
  { path: 'artist', select: 'name email' },
  { path: 'buyer', select: 'name email' },
  {
    path: 'items.artwork',
    select: 'title image price artist',
    populate: { path: 'artist', select: 'name email' },
  },
  { path: 'activeDispute' },
];

exports.getBuyerOrders = async (req, res) => {
  try {
    const filter = buildOrderFilter({ buyer: req.user._id }, req.query);
    const orders = await Order.find(filter)
      .populate(populateOrderItems)
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get buyer orders.' });
  }
};

exports.getArtistOrders = async (req, res) => {
  try {
    const filter = buildOrderFilter({ artist: req.user._id }, req.query);
    const orders = await Order.find(filter)
      .populate('artwork', 'title image price artist')
      .populate('buyer', 'name email')
      .populate({
        path: 'items.artwork',
        select: 'title image price artist',
        populate: { path: 'artist', select: 'name email' },
      })
      .populate('activeDispute')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get artist orders.' });
  }
};

exports.getMyOrders = exports.getBuyerOrders;

/**
 * Artist marks order shipped — requires tracking, courier, proof images, PAID order
 */
exports.shipOrder = async (req, res) => {
  try {
    const orderId = req.body.orderId || req.params.orderId;
    const { trackingId, courier, courierTrackingStatus } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required.' });
    if (!trackingId || !String(trackingId).trim()) {
      return res.status(400).json({ message: 'trackingId is required.' });
    }
    if (!courier || !String(courier).trim()) {
      return res.status(400).json({ message: 'courier name is required.' });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: 'At least one shipment proof image is required.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.artist.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the artist can ship this order.' });
    }
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Order must be paid before shipping.' });
    }
    const st = effectiveStatus(order);
    if (st !== 'paid') {
      return res.status(400).json({ message: 'Order must be paid (PAID) before shipping.' });
    }

    const proofPaths = files.map((f) => `uploads/${f.filename}`);
    order.status = 'shipped';
    order.trackingId = String(trackingId).trim();
    order.courierId = String(trackingId).trim();
    order.courier = String(courier).trim();
    order.proofImages = proofPaths;
    order.shippedAt = new Date();
    order.courierTrackingStatus = (courierTrackingStatus && String(courierTrackingStatus).trim()) || 'IN_TRANSIT';
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + DELIVERY_DAYS);
    order.autoDeliverAt = deadline;

    await order.save();

    const populated = await Order.findById(order._id)
      .populate('artwork', 'title image price')
      .populate('buyer', 'name email')
      .populate('artist', 'name email');
    res.status(200).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to ship order.' });
  }
};

/** Legacy: PATCH status shipped/delivered — redirect to ship for shipped */
exports.updateStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingId, courier } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (order.artist.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the artist can update order status.' });
    }

    if (status === 'shipped') {
      return res.status(400).json({
        message: 'Use PUT /api/orders/ship with multipart proof images.',
      });
    }

    if (!['delivered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    if (status === 'delivered') {
      return res.status(400).json({ message: 'Only buyer or system can mark delivered.' });
    }

    return res.status(400).json({ message: 'Invalid status update.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update order status.' });
  }
};

exports.confirmDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the buyer can confirm delivery.' });
    }

    const st = effectiveStatus(order);
    if (st !== 'shipped') {
      return res.status(400).json({ message: 'Only shipped orders can be confirmed as delivered.' });
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.autoDeliverAt = null;

    await order.save();

    const populated = await Order.findById(orderId)
      .populate('artwork', 'title image price')
      .populate('buyer', 'name email')
      .populate('artist', 'name email');
    res.status(200).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to confirm delivery.' });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the buyer can cancel the order.' });
    }

    if (!canCancel(order)) {
      return res.status(400).json({ message: 'Only unpaid orders can be cancelled.' });
    }

    order.status = 'cancelled';
    await order.save();

    const populated = await Order.findById(orderId)
      .populate('artwork', 'title image price')
      .populate('buyer', 'name email')
      .populate('artist', 'name email');
    res.status(200).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to cancel order.' });
  }
};

const { generateReceiptPDF } = require('../utils/pdfReceipt');

exports.downloadReceipt = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }
    const order = await Order.findOne({
      _id: orderId,
      $or: [{ buyer: req.user._id }, { artist: req.user._id }],
    })
      .populate('artwork', 'title image price artist')
      .populate({
        path: 'items.artwork',
        select: 'title image price artist',
        populate: { path: 'artist', select: 'name email' },
      })
      .populate('buyer', 'name email')
      .populate('artist', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({
        message: 'Receipt is available only after payment is confirmed.',
      });
    }

    const pdfBuffer = await generateReceiptPDF(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${order._id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to generate receipt.' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      $or: [{ user: req.user._id }, { buyer: req.user._id }, { artist: req.user._id }],
    })
      .populate('items.artwork', 'title image price artist')
      .populate('activeDispute');
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get order.' });
  }
};

/** Auto-delivered by cron */
exports.applyAutoDelivered = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) return;
  const st = effectiveStatus(order);
  if (st !== 'shipped') return;
  if (!order.autoDeliverAt || new Date() < order.autoDeliverAt) return;

  order.status = 'delivered';
  order.deliveredAt = new Date();
  order.autoDeliverAt = null;
  await order.save();
};
