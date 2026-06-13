const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const adminController = require('../controllers/adminController');
const adminPayoutController = require('../controllers/adminPayoutController');
const categoryController = require('../controllers/categoryController');

const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// 🔓 ADMIN LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only.' });
    }

    const valid = await user.comparePassword(password);

    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Admin login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    res.status(500).json({ message: err.message || 'Login failed.' });
  }
});

// 🔐 PROTECTED ROUTES
router.use(authMiddleware);
router.use(adminMiddleware);

// 🧾 CURRENT ADMIN
router.get('/me', (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
});

// 👤 USERS
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/approve-artist', adminController.approveArtist);
router.put('/users/:userId/reject-artist', adminController.rejectArtist);

// 🔥 ENABLE / DISABLE ARTIST
router.put('/users/:userId/enable-artist', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = 'artist';

    await user.save();

    res.json({ message: 'Artist enabled successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/users/:userId/disable-artist', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = 'user';

    await user.save();

    res.json({ message: 'Artist disabled successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🚨 REPORTS & ARTWORK CONTROL
router.get('/reports', adminController.getReportedArtworks);
router.put('/artworks/:artworkId/copyright-strike', adminController.copyrightStrike);
router.put('/artworks/:artworkId/disable-selling', adminController.disableArtworkSelling);
router.put('/artworks/:artworkId/enable-selling', adminController.enableArtworkSelling);
router.put('/artworks/:artworkId/under-review', adminController.setArtworkUnderReview);

router.put('/reports/:reportId/resolve', adminController.resolveReport);
router.put('/reports/:reportId/dismiss', adminController.dismissReport);

// 📂 CATEGORIES
router.get('/categories', categoryController.list);
router.post('/categories', categoryController.add);
router.put('/categories/:categoryId', categoryController.edit);
router.delete('/categories/:categoryId', categoryController.delete);

// ✅ NEW FEATURES
router.put('/artworks/:artworkId/toggle-status', adminController.toggleArtworkStatus);
router.put('/users/:userId/toggle-status', adminController.toggleUserStatus);

router.get('/disputes', adminController.listDisputes);
router.put('/disputes/:disputeId/resolve', adminController.resolveDispute);
router.put('/resolve-dispute/:disputeId', adminController.resolveDispute);

router.get('/payouts', adminPayoutController.listPayouts);
router.post('/release-payment', adminPayoutController.releasePayment);

module.exports = router;