const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Artwork = require('../models/Artwork');

const getPlatformFeePercent = () => {
  const raw = process.env.PLATFORM_FEE_PERCENT;
  const n = raw ? Number(raw) : 10;
  // Fallback to 10 if invalid
  return Number.isFinite(n) ? n : 10;
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required.' });
    }
    if (!shippingAddress || typeof shippingAddress !== 'object') {
      return res.status(400).json({ message: 'Shipping address is required.' });
    }
    // Validate required shipping fields
    const { fullName, phone, addressLine1, city, state, pincode } = shippingAddress;
    if (!fullName || !phone || !addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({ message: 'All required shipping fields must be provided.' });
    }

    const feePercent = getPlatformFeePercent();

    let subtotalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const { artworkId, quantity = 1 } = item || {};
      if (!artworkId) {
        return res.status(400).json({ message: 'Each item must include artworkId.' });
      }

      const artwork = await Artwork.findById(artworkId);
      if (!artwork) return res.status(404).json({ message: `Artwork ${artworkId} not found.` });
      if (artwork.status !== 'active') {
        return res.status(400).json({ message: `Artwork "${artwork.title}" is not available.` });
      }
      if (artwork.sellingDisabled) {
        return res.status(400).json({ message: `Selling is disabled for "${artwork.title}".` });
      }

      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const lineTotal = artwork.price * qty;
      subtotalAmount += lineTotal;
      orderItems.push({ artwork: artworkId, quantity: qty, price: artwork.price });
    }

    const platformFeeAmount = Math.round(subtotalAmount * (feePercent / 100));
    const grandTotalAmount = subtotalAmount + platformFeeAmount;

    const firstArtwork = await Artwork.findById(items[0].artworkId);
    if (!firstArtwork) return res.status(404).json({ message: 'First artwork not found.' });

    if (items.length !== 1) {
      // Current model is built around one main artwork+artist, so multi-artwork carts are unsupported for now.
      return res.status(400).json({ message: 'Only single-item checkout is supported at this time.' });
    }

    const order = await Order.create({
      user: req.user._id,
      buyer: req.user._id,
      artist: firstArtwork.artist,
      artwork: firstArtwork._id,
      shippingAddress,
      items: orderItems,
      subtotalAmount,
      platformFeeAmount,
      totalAmount: grandTotalAmount,
      grandTotalAmount,
      status: 'pending_payment',
      paymentStatus: 'unpaid',
      paymentProvider: 'razorpay',
    });

    // Check if Razorpay credentials are configured
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret ||
        razorpayKeyId === 'your_razorpay_key_id' ||
        razorpayKeySecret === 'your_razorpay_key_secret') {
      return res.status(500).json({
        message: 'Razorpay is not configured on server. Set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      });
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // Razorpay expects amount in paise (integer)
    const amountPaise = Math.round(grandTotalAmount * 100);

    const rzOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: String(order._id),
      payment_capture: 1,
    });

    order.razorpayOrderId = rzOrder.id;
    await order.save();

    return res.status(201).json({
      backendOrderId: order._id,
      razorpayOrderId: rzOrder.id,
      amount: rzOrder.amount, // paise
      currency: rzOrder.currency,
      key_id: razorpayKeyId,
      platformFeePercent: feePercent,
      subtotalAmount,
      platformFeeAmount,
      grandTotalAmount,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to create Razorpay order.' });
  }
};

/**
 * Create a fresh Razorpay order for an existing unpaid buyer order (e.g. Pay now from dashboard).
 */
exports.createRazorpayPaymentForExistingOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    if (String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to pay for this order.' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'This order is already paid.' });
    }
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return res.status(400).json({ message: 'This order cannot be paid.' });
    }
    if (!['pending_payment', 'pending'].includes(order.status)) {
      return res.status(400).json({ message: 'Order is not awaiting payment.' });
    }
    if (!order.shippingAddress) {
      return res.status(400).json({ message: 'Order is missing shipping address.' });
    }

    const grandTotalAmount = order.grandTotalAmount ?? order.totalAmount;
    if (!grandTotalAmount || grandTotalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid order amount.' });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (
      !razorpayKeyId ||
      !razorpayKeySecret ||
      razorpayKeyId === 'your_razorpay_key_id' ||
      razorpayKeySecret === 'your_razorpay_key_secret'
    ) {
      return res.status(500).json({
        message: 'Razorpay is not configured on server. Set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      });
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const amountPaise = Math.round(grandTotalAmount * 100);

    const rzOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: String(order._id).slice(0, 40),
      payment_capture: 1,
    });

    order.razorpayOrderId = rzOrder.id;
    order.paymentProvider = order.paymentProvider || 'razorpay';
    await order.save();

    const feePercent = getPlatformFeePercent();

    return res.status(200).json({
      backendOrderId: order._id,
      razorpayOrderId: rzOrder.id,
      amount: rzOrder.amount,
      currency: rzOrder.currency,
      key_id: razorpayKeyId,
      platformFeePercent: feePercent,
      subtotalAmount: order.subtotalAmount,
      platformFeeAmount: order.platformFeeAmount,
      grandTotalAmount,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to start payment.' });
  }
};

exports.razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!signature || !webhookSecret) {
      return res.status(400).json({ message: 'Missing webhook signature.' });
    }

    const rawBody = req.rawBody;
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expected !== signature) {
      return res.status(400).json({ message: 'Invalid webhook signature.' });
    }

    // Typical webhook payload: { event: 'payment.captured', payload: { payment: { entity: ... } } }
    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity;
    const orderEntity = req.body?.payload?.order?.entity;

    const razorpayOrderId =
      paymentEntity?.order_id || orderEntity?.id || req.body?.payload?.order_id;

    const razorpayPaymentId = paymentEntity?.id || null;

    if (!razorpayOrderId) {
      return res.status(200).json({ message: 'Event ignored (missing order id).' });
    }

    const order = await Order.findOne({ razorpayOrderId });
    if (!order) {
      return res.status(200).json({ message: 'Order not found for this webhook.' });
    }

    // Idempotency
    if (order.paymentStatus === 'paid') {
      return res.status(200).json({ message: 'Already processed.' });
    }

    // Confirm payment
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = paymentEntity?.signature || null;

    if (
      order.status === 'pending_payment' ||
      order.status === 'pending' ||
      !order.status
    ) {
      order.status = 'paid';
    }

    await order.save();
    return res.status(200).json({ message: 'Payment webhook processed.', event });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Webhook processing failed.' });
  }
};

exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { backendOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!backendOrderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing required Razorpay payment verification fields.' });
    }

    const order = await Order.findById(backendOrderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to verify this payment.' });
    }

    if (order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: 'Razorpay order ID mismatch.' });
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret || razorpayKeySecret === 'your_razorpay_key_secret') {
      return res.status(500).json({ message: 'Razorpay secret key is not configured on server.' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(400).json({ message: 'Payment signature verification failed.' });
    }

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    if (order.status === 'pending_payment' || order.status === 'pending') {
      order.status = 'paid';
    }
    await order.save();

    return res.status(200).json({
      message: 'Payment verified successfully.',
      orderId: order._id,
      paymentStatus: order.paymentStatus,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Payment verification failed.' });
  }
};

