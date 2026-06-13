const Razorpay = require('razorpay');
const Order = require('../models/Order');
const User = require('../models/User');
const Payout = require('../models/Payout');
const { razorpayPost } = require('../utils/razorpayFetch');
const { decryptBankPayload } = require('../utils/bankCrypto');

const PAYOUT_ADMIN_ONLY = process.env.PAYOUT_MODE !== 'automatic';

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

function getPlainBank(artist) {
  if (!artist) throw new Error('Artist not found');
  if (artist.bankDetailsEnc?.iv) {
    const p = decryptBankPayload(artist.bankDetailsEnc);
    return {
      name: p.accountHolderName,
      accountNumber: p.accountNumber,
      ifsc: p.ifsc,
    };
  }
  const l = artist.bankDetails || {};
  if (l.accountNumber && l.ifsc && l.name) {
    return { name: l.name, accountNumber: l.accountNumber, ifsc: l.ifsc };
  }
  throw new Error('Artist has no bank details on file');
}

async function ensureFundAccount(artist, plain) {
  const rz = getRazorpay();
  if (!rz) throw new Error('Razorpay is not configured.');

  const name = plain.name;
  const accountNumber = plain.accountNumber;
  const ifsc = plain.ifsc;

  if (artist.razorpayFundAccountId) {
    return artist.razorpayFundAccountId;
  }

  let contactId = artist.razorpayContactId;
  if (!contactId) {
    const contact = await razorpayPost('/v1/contacts', {
      name: String(name).slice(0, 140),
      email: artist.email,
      contact: String(artist.phone || '9999999999').replace(/\D/g, '').slice(-10) || '9999999999',
      type: 'vendor',
      reference_id: `user_${artist._id}`.slice(0, 40),
    });
    contactId = contact.id;
    artist.razorpayContactId = contactId;
  }

  const fund = await rz.fundAccount.create({
    contact_id: contactId,
    account_type: 'bank_account',
    bank_account: {
      name: String(name).slice(0, 140),
      ifsc: String(ifsc).toUpperCase(),
      account_number: String(accountNumber),
    },
  });

  artist.razorpayFundAccountId = fund.id;
  await artist.save({ validateBeforeSave: false });
  return fund.id;
}

/**
 * @param {string} orderId
 * @param {{ fromAdmin?: boolean, retry?: boolean }} options
 */
exports.tryProcessPayout = async (orderId, options = {}) => {
  if (PAYOUT_ADMIN_ONLY && !options.fromAdmin) {
    return { ok: false, reason: 'Payouts are released by admin only (set PAYOUT_MODE=automatic to enable auto).' };
  }

  const order = await Order.findById(orderId).populate('artist');
  if (!order) return { ok: false, reason: 'no_order' };

  if (
    order.payoutBlocked ||
    order.activeDispute ||
    order.status === 'dispute' ||
    order.status === 'under_review'
  ) {
    return { ok: false, reason: 'dispute_or_blocked' };
  }

  if (order.payoutReleased) return { ok: false, reason: 'already_released' };
  if (order.paymentStatus !== 'paid') return { ok: false, reason: 'unpaid' };
  if (order.status !== 'delivered') return { ok: false, reason: 'not_delivered' };

  const existing = await Payout.findOne({ order: order._id });
  if (existing && existing.status === 'processing') {
    return { ok: false, reason: 'payout_in_progress' };
  }
  if (existing && existing.status === 'processed' && order.payoutReleased) {
    return { ok: true, skipped: true };
  }

  // Buyer pays grandTotal = subtotal + platformFee; artist receives the listing subtotal (fee is on top).
  const artistAmount = Math.max(0, Number(order.subtotalAmount) || 0);
  if (artistAmount <= 0) return { ok: false, reason: 'zero_amount' };

  const artist = await User.findById(order.artist._id || order.artist).select('+bankDetailsEnc');
  if (!artist) return { ok: false, reason: 'no_artist' };

  let plain;
  try {
    plain = getPlainBank(artist);
  } catch (e) {
    return { ok: false, reason: e.message || 'no_bank' };
  }

  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  if (!accountNumber) {
    await Payout.findOneAndUpdate(
      { order: order._id },
      {
        order: order._id,
        artist: artist._id,
        amount: artistAmount,
        commissionAmount: order.platformFeeAmount,
        status: 'failed',
        failureReason: 'RAZORPAYX_ACCOUNT_NUMBER missing in .env',
      },
      { upsert: true, new: true }
    );
    return { ok: false, reason: 'RAZORPAY X account not configured' };
  }

  try {
    const fundAccountId = await ensureFundAccount(artist, plain);

    const payoutDoc = await Payout.findOneAndUpdate(
      { order: order._id },
      {
        order: order._id,
        artist: artist._id,
        amount: artistAmount,
        commissionAmount: order.platformFeeAmount,
        status: 'processing',
        razorpayFundAccountId: fundAccountId,
        failureReason: null,
      },
      { upsert: true, new: true }
    );

    const amountPaise = Math.round(artistAmount * 100);
    const payout = await razorpayPost('/v1/payouts', {
      account_number: accountNumber,
      fund_account_id: fundAccountId,
      amount: amountPaise,
      currency: 'INR',
      mode: 'IMPS',
      purpose: 'payout',
      queue_if_instant: true,
      reference_id: String(order._id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40),
      narration: `Art ${String(order._id).slice(-8)}`,
    });

    payoutDoc.razorpayPayoutId = payout.id;
    payoutDoc.transactionId = payout.id;
    payoutDoc.status = 'processed';
    payoutDoc.meta = payout;
    await payoutDoc.save();

    order.payoutReleased = true;
    await order.save();

    return { ok: true, payout: payoutDoc };
  } catch (err) {
    const msg = err?.message || 'Payout failed';
    await Payout.findOneAndUpdate(
      { order: order._id },
      {
        status: 'failed',
        failureReason: msg,
        $inc: { retryCount: 1 },
        lastAttemptAt: new Date(),
      },
      { upsert: true }
    );
    return { ok: false, reason: msg };
  }
};

exports.triggerPayout = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId required' });
    const result = await exports.tryProcessPayout(orderId, { fromAdmin: true });
    if (!result.ok) {
      return res.status(400).json({ message: result.reason || 'Payout failed', result });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
