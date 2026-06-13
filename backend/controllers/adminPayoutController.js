const Order = require('../models/Order');
const User = require('../models/User');
const Payout = require('../models/Payout');
const { tryProcessPayout } = require('./payoutController');
const { decryptBankPayload, maskAccountNumber, maskIfsc, maskName } = require('../utils/bankCrypto');

function maskedFromArtistDoc(artist) {
  if (!artist) return null;
  try {
    if (artist.bankDetailsEnc?.iv) {
      const p = decryptBankPayload(artist.bankDetailsEnc);
      return {
        accountHolderName: maskName(p.accountHolderName),
        accountNumber: maskAccountNumber(p.accountNumber),
        ifsc: maskIfsc(p.ifsc),
      };
    }
    const l = artist.bankDetails || {};
    if (l.accountNumber || l.ifsc) {
      return {
        accountHolderName: l.name ? maskName(l.name) : '****',
        accountNumber: maskAccountNumber(l.accountNumber),
        ifsc: maskIfsc(l.ifsc),
      };
    }
  } catch {
    /* ignore */
  }
  return artist.hasBankDetails
    ? { accountHolderName: '****', accountNumber: '****', ifsc: '****' }
    : null;
}

/**
 * GET /api/admin/payouts — delivered, paid orders; payout status; masked bank
 */
exports.listPayouts = async (req, res) => {
  try {
    const orders = await Order.find({
      status: 'delivered',
      paymentStatus: 'paid',
    })
      .populate('artist', 'name email hasBankDetails bankDetailsEnc bankDetails phone')
      .sort({ updatedAt: -1 })
      .limit(300)
      .lean();

    const artistIds = [
      ...new Set(
        orders
          .map((o) => {
            const a = o.artist;
            if (!a) return null;
            return typeof a === 'object' && a._id ? String(a._id) : String(a);
          })
          .filter(Boolean)
      ),
    ];

    const artistDocs = await User.find({ _id: { $in: artistIds } })
      .select('name email hasBankDetails bankDetailsEnc bankDetails phone')
      .lean();
    const artistById = new Map(artistDocs.map((u) => [String(u._id), u]));

    const payoutByOrder = await Payout.find({
      order: { $in: orders.map((o) => o._id) },
    }).lean();
    const payoutMap = new Map(payoutByOrder.map((p) => [String(p.order), p]));

    const rows = [];
    for (const o of orders) {
      const disputeBlocked =
        o.payoutBlocked === true ||
        o.activeDispute ||
        o.status === 'dispute' ||
        o.status === 'under_review';

      const payout = payoutMap.get(String(o._id));
      const pop = o.artist && typeof o.artist === 'object' ? o.artist : null;
      const aid = pop?._id ? String(pop._id) : o.artist ? String(o.artist) : null;
      const artist = aid ? artistById.get(aid) || pop : null;

      const subtotal = Number(o.subtotalAmount) || 0;
      const platformFee = Number(o.platformFeeAmount) || 0;
      const grand =
        o.grandTotalAmount != null
          ? Number(o.grandTotalAmount)
          : o.totalAmount != null
            ? Number(o.totalAmount)
            : subtotal + platformFee;

      // Artist receives listing subtotal; buyer already paid platform fee on top.
      const payoutAmount = Math.max(0, subtotal);

      rows.push({
        orderId: o._id,
        artistId: artist?._id ?? aid,
        artistName: artist?.name || '—',
        artistEmail: artist?.email || '—',
        amount: payoutAmount,
        subtotalAmount: subtotal,
        grandTotalAmount: grand,
        commissionAmount: platformFee,
        hasBankDetails: !!artist?.hasBankDetails,
        orderStatus: o.status,
        payoutReleased: !!o.payoutReleased,
        payoutBlocked: !!disputeBlocked,
        canRelease:
          !!artist?.hasBankDetails &&
          !disputeBlocked &&
          !o.payoutReleased &&
          (!payout || payout.status === 'failed' || payout.status === 'pending'),
        maskedBank: maskedFromArtistDoc(artist),
        payoutStatus: payout?.status || (o.payoutReleased ? 'processed' : 'none'),
        transactionId: payout?.razorpayPayoutId || null,
        failureReason: payout?.failureReason || null,
      });
    }

    res.json({ payouts: rows });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list payouts' });
  }
};

/**
 * POST /api/admin/release-payment  { orderId }
 */
exports.releasePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Order must be DELIVERED to release payout' });
    }
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Order must be paid' });
    }
    if (order.payoutBlocked || order.activeDispute || order.status === 'dispute') {
      return res.status(400).json({ message: 'Payout blocked (dispute or hold)' });
    }
    if (order.payoutReleased) {
      return res.status(400).json({ message: 'Payout already released' });
    }

    const result = await tryProcessPayout(orderId, { fromAdmin: true });
    if (!result.ok) {
      return res.status(400).json({ message: result.reason || 'Payout failed', result });
    }
    res.json({ message: 'Payout processed', result });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Release failed' });
  }
};
