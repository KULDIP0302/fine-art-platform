const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const paymentController = require('../controllers/paymentController');
const payoutController = require('../controllers/payoutController');

// Create Razorpay order + corresponding backend Order (paymentStatus=unpaid)
router.post('/razorpay/create-order', authMiddleware, paymentController.createRazorpayOrder);

// Pay for an existing unpaid order (dashboard "Pay now")
router.post(
  '/razorpay/pay-order/:orderId',
  authMiddleware,
  paymentController.createRazorpayPaymentForExistingOrder,
);

// Verify payment signature sent by Razorpay checkout callback.
router.post('/razorpay/verify', authMiddleware, paymentController.verifyRazorpayPayment);

// Razorpay webhook (no auth). Used to confirm payment and mark Order as paid.
router.post('/razorpay/webhook', paymentController.razorpayWebhook);

router.post('/payout', authMiddleware, adminMiddleware, payoutController.triggerPayout);

module.exports = router;

