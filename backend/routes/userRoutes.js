const express = require('express');
const router = express.Router();
exports.router = router;

const userController = require('../controllers/userController');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multer');

// =======================
// 🌐 PUBLIC ROUTES
// =======================
router.post('/register', userController.register);
router.post('/login', userController.login);

router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

router.get('/artists/:userId/public', userController.getPublicArtistSummary);
router.post('/contact', userController.contact);

// =======================
// 🔐 PROTECTED ROUTES
// =======================
router.use(authMiddleware);

// 👤 PROFILE
router.get('/profile', userController.getProfile);
router.put('/profile', upload.single('profilePic'), userController.updateProfile);
router.put('/profile/bank', userController.updateBankDetails);

// 🔑 CHANGE PASSWORD
router.post('/send-change-password-otp', userController.sendChangePasswordOTP);
router.post('/change-password', userController.changePassword);

// 🎨 APPLY ARTIST
router.post(
  '/apply-artist',
  upload.single('passportPhoto'),
  userController.applyForArtist
);

// ❤️ FOLLOW SYSTEM
router.post('/follow/:artistId', userController.followArtist);
router.delete('/follow/:artistId', userController.unfollowArtist);

// 🔖 SAVE ARTWORK
router.post('/artworks/:artworkId/save', userController.saveArtwork);
router.delete('/artworks/:artworkId/save', userController.unsaveArtwork);

// 🛒 ORDER (aliases for /api/orders — keeps existing frontend paths working)
router.put('/orders/:orderId/cancel', orderController.cancelOrder);

// =======================
// 💬 MESSAGES (CHAT)
// =======================

// 🔥 GET ALL CONVERSATIONS (FIXED)
router.get('/messages', async (req, res) => {
  try {
    const userId = req.user._id;
    const Message = require('../models/Message');

    const messages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    })
      .populate('sender receiver', 'name profilePic')
      .sort({ createdAt: -1 });

    const conversationsMap = {};

    messages.forEach(msg => {
      const otherUser =
        msg.sender._id.toString() === userId.toString()
          ? msg.receiver
          : msg.sender;

      if (!conversationsMap[otherUser._id]) {
        conversationsMap[otherUser._id] = {
          id: otherUser._id,
          participantId: otherUser._id,
          participantName: otherUser.name,
          participantAvatar: otherUser.profilePic,
          lastMessage: msg.content,
          unreadCount: msg.read ? 0 : 1,
        };
      }
    });

    res.json(Object.values(conversationsMap));

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 📩 SEND MESSAGE
router.post('/messages', upload.single('media'), userController.sendMessage);

// 📥 GET SINGLE CHAT
router.get('/messages/:otherUserId', userController.getMessages);

// ✅ MARK AS READ
router.put('/messages/:messageId/read', userController.markAsRead);

// =======================
// 🎨 ARTIST PANEL
// =======================
router.get('/artist/orders', orderController.getArtistOrders);
router.put(
  '/artist/orders/:orderId/ship',
  upload.array('proofImages', 12),
  orderController.shipOrder
);
router.put('/artist/orders/:orderId', userController.updateOrderStatus);
router.get('/artist/reports', userController.getArtistReports);

// =======================
// 🧾 USER ORDERS
// =======================
router.get('/orders', orderController.getBuyerOrders);
router.get('/orders/:orderId/receipt', orderController.downloadReceipt);
router.get('/orders/:orderId', orderController.getOrderById);

module.exports = router;