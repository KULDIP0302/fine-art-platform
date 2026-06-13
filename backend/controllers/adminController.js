const User = require('../models/User');
const Artwork = require('../models/Artwork');
const Report = require('../models/Report');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Dispute = require('../models/Dispute');
const { incrementFalseDisputeCount } = require('./disputeController');

// 👤 GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ APPROVE ARTIST
exports.approveArtist = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.artistApplication.status = 'approved';
    user.artistApplication.reviewedAt = new Date();
    user.role = 'artist';

    await user.save();

    res.json({ message: 'Artist approved', user });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ❌ REJECT ARTIST
exports.rejectArtist = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.artistApplication.status = 'rejected';
    user.artistApplication.reviewedAt = new Date();

    await user.save();

    res.json({ message: 'Artist rejected', user });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔥 ENABLE ARTIST
exports.enableArtist = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = 'artist';
    await user.save();

    res.json({ message: 'Artist enabled' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔥 DISABLE ARTIST
exports.disableArtist = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = 'user';
    await user.save();

    res.json({ message: 'Artist disabled' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🚨 GET REPORTS
exports.getReportedArtworks = async (req, res) => {
  try {
    const reports = await Report.find({ status: 'open' })
      .populate('artwork')
      .populate('reportedBy', 'name email');

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ TOGGLE ARTWORK STATUS
exports.toggleArtworkStatus = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.artworkId);
    if (!artwork) return res.status(404).json({ message: 'Artwork not found' });
    artwork.status = artwork.status === 'active' ? 'disabled' : 'active';
    await artwork.save();
    res.json({ message: `Artwork ${artwork.status}`, artwork });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ TOGGLE USER STATUS (DISABLE/ENABLE ACCOUNT)
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Perhaps add a disabled field
    user.role = user.role === 'disabled' ? 'user' : 'disabled'; // Assuming we add 'disabled' to enum
    await user.save();
    res.json({ message: `User ${user.role}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ CATEGORY MANAGEMENT
exports.addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.create({ name, description });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.editCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    category.name = req.body.name || category.name;
    category.description = req.body.description || category.description;
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.categoryId);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ⚠️ COPYRIGHT STRIKE
exports.copyrightStrike = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.artworkId);

    if (!artwork) return res.status(404).json({ message: 'Artwork not found' });

    artwork.status = 'copyright_strike';
    artwork.sellingDisabled = true;

    await artwork.save();

    await Report.updateMany({ artwork: artwork._id }, { status: 'resolved' });

    res.json({ message: 'Copyright strike applied' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔴 DISABLE SELLING
exports.disableArtworkSelling = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.artworkId);

    if (!artwork) return res.status(404).json({ message: 'Artwork not found' });

    artwork.sellingDisabled = true;
    await artwork.save();

    res.json({ message: 'Selling disabled' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 ENABLE SELLING
exports.enableArtworkSelling = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.artworkId);

    if (!artwork) return res.status(404).json({ message: 'Artwork not found' });

    artwork.sellingDisabled = false;
    await artwork.save();

    res.json({ message: 'Selling enabled' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟡 UNDER REVIEW (🔥 MISSING FUNCTION FIXED)
exports.setArtworkUnderReview = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.artworkId);

    if (!artwork) return res.status(404).json({ message: 'Artwork not found' });

    artwork.status = 'under_review';
    artwork.sellingDisabled = true;

    await artwork.save();

    res.json({ message: 'Artwork set to under review' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ RESOLVE REPORT
exports.resolveReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId);

    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = 'resolved';
    await report.save();

    res.json({ message: 'Report resolved' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ❌ DISMISS REPORT
exports.dismissReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId);

    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = 'dismissed';
    await report.save();

    res.json({ message: 'Report dismissed' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate({
        path: 'order',
        populate: [
          { path: 'artwork', select: 'title image price' },
          { path: 'buyer', select: 'name email phone' },
          { path: 'artist', select: 'name email phone' },
        ],
      })
      .populate('buyer', 'name email phone')
      .populate('artist', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Body: { action, buyerProofStrong?, partialRefundAmount?, notes? }
 * action: APPROVE_DELIVERY | REFUND_BUYER | PARTIAL_REFUND | REJECT_CLAIM | AUTO
 */
exports.resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    let { action, buyerProofStrong, partialRefundAmount, notes } = req.body;

    const dispute = await Dispute.findById(disputeId).populate('order');
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    const order = await Order.findById(dispute.order._id || dispute.order);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (action === 'AUTO') {
      const delivered = String(order.courierTrackingStatus || '').toUpperCase() === 'DELIVERED';
      const hasArtistProof = Array.isArray(order.proofImages) && order.proofImages.length > 0;
      const strong = buyerProofStrong === true;
      if (delivered && hasArtistProof && !strong) {
        action = 'REJECT_CLAIM';
      } else if (!delivered) {
        action = 'REFUND_BUYER';
      } else {
        return res.status(400).json({
          message:
            'Auto resolution ambiguous (e.g. tracking shows DELIVERED but buyer proof marked strong). Pick a manual action.',
        });
      }
    }

    dispute.status = 'resolved';
    dispute.adminNotes = notes || dispute.adminNotes;
    dispute.resolvedAt = new Date();
    if (buyerProofStrong != null) dispute.buyerProofStrong = !!buyerProofStrong;

    if (action === 'APPROVE_DELIVERY') {
      dispute.adminDecision = 'APPROVE_DELIVERY';
      order.status = 'delivered';
      order.deliveredAt = new Date();
      order.autoDeliverAt = null;
      order.payoutBlocked = false;
      order.activeDispute = null;
    } else if (action === 'REFUND_BUYER') {
      dispute.adminDecision = 'REFUND_BUYER';
      order.status = 'refunded';
      order.payoutBlocked = true;
      order.activeDispute = null;
    } else if (action === 'PARTIAL_REFUND') {
      const amt = Number(partialRefundAmount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return res.status(400).json({ message: 'partialRefundAmount required' });
      }
      dispute.adminDecision = 'PARTIAL_REFUND';
      order.status = 'partial_refund';
      order.partialRefundAmount = amt;
      order.payoutBlocked = true;
      order.activeDispute = null;
    } else if (action === 'REJECT_CLAIM') {
      dispute.adminDecision = 'REJECT_CLAIM';
      order.status = 'delivered';
      order.deliveredAt = new Date();
      order.autoDeliverAt = null;
      order.payoutBlocked = false;
      order.activeDispute = null;
      await incrementFalseDisputeCount(dispute.buyer);
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await dispute.save();
    await order.save();

    const fresh = await Dispute.findById(dispute._id)
      .populate({
        path: 'order',
        populate: [
          { path: 'artwork', select: 'title image price' },
          { path: 'buyer', select: 'name email' },
          { path: 'artist', select: 'name email' },
        ],
      })
      .populate('buyer', 'name email')
      .populate('artist', 'name email');

    res.json({ message: 'Dispute resolved', dispute: fresh });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};