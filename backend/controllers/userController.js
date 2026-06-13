const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Order = require('../models/Order');
const Artwork = require('../models/Artwork');
const Report = require('../models/Report');
const Message = require('../models/Message');

const { generateOTP, sendOTPEmail } = require('../utils/emailService');
const { encryptBankPayload } = require('../utils/bankCrypto');
const { sanitizeUser } = require('../utils/userSerialize');

// 🔐 TOKEN
const generateToken = (id) =>
  jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '7d' });


// =======================
// ✅ REGISTER
// =======================
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email exists' });

  const user = await User.create({ name, email, password });

  res.json({
    token: generateToken(user._id),
    user: sanitizeUser(user),
  });
};

// LOGIN
exports.login = async (req, res) => {
  let { email, password } = req.body;
  email = email?.trim().toLowerCase();

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.accountRestricted) {
    return res.status(403).json({ message: 'Account restricted. Contact support.' });
  }

  res.json({
    token: generateToken(user._id),
    user: sanitizeUser(user),
  });
};


// =======================
// ✅ PROFILE
// =======================
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('+bankDetailsEnc');
  res.json(sanitizeUser(user));
};

exports.contact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email and message are required.' });
    }

    const supportEmail =
      process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || 'support@fineart.com';

    const { createTransport } = require('../utils/emailService');
    const transporter = createTransport();

    const mailData = {
      from: `${name} <${email}>`,
      to: supportEmail,
      subject: `Contact form: ${subject || 'No subject'}`,
      text: `From: ${name} <${email}>
Subject: ${subject}

${message}`,
      html: `<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Subject:</strong> ${subject || 'No subject'}</p>
<p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br/>')}</p>`,
    };

    if (transporter) {
      await transporter.sendMail(mailData);
    } else {
      console.log('[support contact] email not sent (SMTP missing):', mailData);
    }

    res.json({ message: 'We received your message. We will get back to you soon.' });
  } catch (err) {
    console.error('[support contact] error', err);
    res.status(500).json({ message: 'Failed to send message.' });
  }
};

exports.updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('+bankDetailsEnc');

  if (req.body.name) user.name = req.body.name;
  if (req.body.bio) user.bio = req.body.bio;
  if (req.body.phone != null) user.phone = String(req.body.phone);
  if (req.file) user.profilePic = `uploads/${req.file.filename}`;

  await user.save();
  res.json(sanitizeUser(user));
};

exports.updateBankDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+bankDetailsEnc');
    const body = req.body || {};
    const accountHolderName = body.accountHolderName ?? body.name;
    const accountNumber = body.accountNumber;
    const ifsc = body.ifsc;

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!accountHolderName || !String(accountHolderName).trim()) {
      return res.status(400).json({ message: 'Account holder name is required.' });
    }
    if (!accountNumber || !String(accountNumber).trim()) {
      return res.status(400).json({ message: 'Account number is required.' });
    }
    if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(ifsc).replace(/\s/g, ''))) {
      return res.status(400).json({ message: 'Valid 11-character IFSC is required.' });
    }

    user.bankDetailsEnc = encryptBankPayload({
      accountHolderName: String(accountHolderName).trim(),
      accountNumber: String(accountNumber).trim(),
      ifsc: String(ifsc).trim(),
    });
    user.hasBankDetails = true;
    user.bankDetails = { accountNumber: '', ifsc: '', name: '' };
    user.razorpayContactId = null;
    user.razorpayFundAccountId = null;
    await user.save();
    res.json(sanitizeUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update bank details' });
  }
};


// =======================
// ✅ FOLLOW SYSTEM
// =======================
exports.followArtist = async (req, res) => {
  try {
    const artistId = req.params.artistId;
    if (String(artistId) === String(req.user._id)) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }
    const target = await User.findById(artistId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const user = await User.findById(req.user._id);
    const already = user.following.some((id) => id.toString() === String(artistId));
    if (!already) {
      user.following.push(artistId);
      await user.save();
    }

    const hasFollower = (target.followers || []).some((id) => id.toString() === String(req.user._id));
    if (!hasFollower) {
      target.followers.push(req.user._id);
      await target.save();
    }

    const fresh = await User.findById(req.user._id).select('+bankDetailsEnc');
    res.json({
      user: sanitizeUser(fresh),
      following: fresh.following.map((id) => id.toString()),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Follow failed' });
  }
};

exports.unfollowArtist = async (req, res) => {
  try {
    const artistId = req.params.artistId;
    const user = await User.findById(req.user._id);
    user.following = user.following.filter((id) => id.toString() !== String(artistId));
    await user.save();

    const target = await User.findById(artistId);
    if (target) {
      target.followers = (target.followers || []).filter((id) => id.toString() !== String(req.user._id));
      await target.save();
    }

    const fresh = await User.findById(req.user._id).select('+bankDetailsEnc');
    res.json({
      user: sanitizeUser(fresh),
      following: fresh.following.map((id) => id.toString()),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Unfollow failed' });
  }
};

/** Public card for following list (any followed user) / artist snippets */
exports.getPublicArtistSummary = async (req, res) => {
  try {
    const artist = await User.findById(req.params.userId).select('name bio profilePic role followers updatedAt');
    if (!artist) return res.status(404).json({ message: 'Not found' });
    // Following can include non-artist accounts; followArtist does not require role=artist.
    const followerCount = Array.isArray(artist.followers) ? artist.followers.length : 0;
    res.json({
      _id: artist._id,
      name: artist.name,
      bio: artist.bio,
      profilePic: artist.profilePic,
      profilePicVersion: artist.updatedAt ? new Date(artist.updatedAt).getTime() : undefined,
      followerCount,
      role: artist.role,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load artist' });
  }
};


// =======================
// ✅ ORDERS
// =======================
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({
    $or: [{ buyer: req.user._id }, { user: req.user._id }],
  })
    .populate('items.artwork')
    .sort({ createdAt: -1 });

  res.json(orders);
};

exports.createOrder = async (req, res) => {
  try {
    const { artworkId, quantity = 1 } = req.body;

    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    const total = artwork.price * quantity;

    const order = await Order.create({
      buyer: req.user._id,
      artwork: artwork._id,
      items: [{ artwork: artwork._id, quantity, price: artwork.price }],
      total,
      status: 'pending',
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (order.status !== 'pending') {
    return res.status(400).json({ message: 'Cannot cancel' });
  }

  order.status = 'cancelled';
  await order.save();

  res.json({ message: 'Order cancelled' });
};


// =======================
// ✅ CHAT SYSTEM
// =======================
exports.sendMessage = async (req, res) => {
  const { receiverId, content } = req.body;

  const message = await Message.create({
    sender: req.user._id,
    receiver: receiverId,
    content,
  });

  req.app.get('io').to(receiverId).emit('new-message', message);

  res.json(message);
};

exports.getMessages = async (req, res) => {
  const { otherUserId } = req.params;

  const messages = await Message.find({
    $or: [
      { sender: req.user._id, receiver: otherUserId },
      { sender: otherUserId, receiver: req.user._id },
    ],
  }).sort({ createdAt: 1 });

  res.json(messages);
};


// =======================
// ✅ FORGOT PASSWORD
// =======================
exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    user.resetOTP = otp;
    user.resetOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendOTPEmail(email, otp, 'reset');
    } catch (mailErr) {
      console.error('[forgot-password] send failed:', mailErr?.message || mailErr);
      if (process.env.OTP_DEV_ECHO === 'true') {
        return res.json({ message: 'OTP generated (dev echo)', otp });
      }
      return res.status(502).json({
        message:
          mailErr?.message ||
          'Could not send email. Check EMAIL_USER, EMAIL_PASS (Gmail App Password), and SMTP settings.',
      });
    }

    res.json({ message: 'OTP sent' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};


// =======================
// ✅ RESET PASSWORD
// =======================
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email });

  if (!user || user.resetOTP !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  if (new Date() > user.resetOTPExpiry) {
    return res.status(400).json({ message: 'OTP expired' });
  }

  user.password = newPassword;
  user.resetOTP = undefined;
  user.resetOTPExpiry = undefined;

  await user.save();

  res.json({ message: 'Password reset success' });
};
// ✅ GET CONVERSATIONS (FIXED)
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    })
      .populate('sender', 'name profilePic')
      .populate('receiver', 'name profilePic')
      .sort({ createdAt: -1 });

    const conversations = [];

    messages.forEach((msg) => {
      const otherUser =
        msg.sender._id.toString() === userId.toString()
          ? msg.receiver
          : msg.sender;

      if (!conversations.find(c => c.userId === otherUser._id.toString())) {
        conversations.push({
          userId: otherUser._id,
          name: otherUser.name,
          profilePic: otherUser.profilePic,
          lastMessage: msg.content,
          time: msg.createdAt,
        });
      }
    });

    res.json(conversations);

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
// ✅ GENERATE RECEIPT (FIXED)
const { generateReceiptPDF } = require('../utils/pdfReceipt');

exports.generateReceipt = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('items.artwork')
      .populate('buyer', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // सुरक्षा (user अपना ही order देखे)
    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const pdfBuffer = await generateReceiptPDF(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=receipt-${order._id}.pdf`
    );

    res.send(pdfBuffer);

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
// =======================
// 🔥 MISSING FUNCTIONS FIX
// =======================

exports.sendChangePasswordOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const otp = generateOTP();
    user.changePasswordOTP = otp;
    user.changePasswordOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    const to = String(req.body?.email || user.email || '').trim().toLowerCase();
    try {
      await sendOTPEmail(to, otp, 'change');
    } catch (mailErr) {
      console.error('[change-password-otp] send failed:', mailErr?.message || mailErr);
      if (process.env.OTP_DEV_ECHO === 'true') {
        return res.json({ message: 'OTP generated (dev echo)', otp });
      }
      return res.status(502).json({
        message:
          mailErr?.message ||
          'Could not send email. Configure EMAIL_USER and EMAIL_PASS in backend/.env',
      });
    }
    res.json({ message: 'Change password OTP sent' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  const { otp, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (user.changePasswordOTP !== otp || new Date() > user.changePasswordOTPExpiry) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }
  user.password = newPassword;
  user.changePasswordOTP = undefined;
  user.changePasswordOTPExpiry = undefined;
  await user.save();
  res.json({ message: 'Password changed successfully' });
};

exports.applyForArtist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+bankDetailsEnc');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'artist') {
      return res.status(400).json({ message: 'You are already an artist' });
    }
    const appStatus = user.artistApplication?.status;
    if (appStatus === 'pending') {
      return res.status(400).json({ message: 'Application already pending' });
    }

    const body = req.body || {};
    const accountHolderName = String(body.accountHolderName || body.name || '').trim();
    const accountNumber = String(body.accountNumber || '').replace(/\s/g, '');
    const ifsc = String(body.ifsc || '').replace(/\s/g, '').toUpperCase();

    if (!accountHolderName) {
      return res.status(400).json({ message: 'Account holder name is required' });
    }
    if (!accountNumber || accountNumber.length < 6) {
      return res.status(400).json({ message: 'Valid account number is required' });
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return res.status(400).json({ message: 'Valid 11-character IFSC is required' });
    }
    if (!req.file?.filename) {
      return res.status(400).json({ message: 'Passport photo is required' });
    }

    if (!user.artistApplication) {
      user.artistApplication = {};
    }

    let portfolioUrls = [];
    if (Array.isArray(body.portfolioUrls)) portfolioUrls = body.portfolioUrls.map(String);
    else if (body.portfolioUrls && typeof body.portfolioUrls === 'string') {
      portfolioUrls = [body.portfolioUrls];
    } else if (body.portfolio && String(body.portfolio).trim()) {
      portfolioUrls = [String(body.portfolio).trim()];
    }

    user.bankDetailsEnc = encryptBankPayload({
      accountHolderName,
      accountNumber,
      ifsc,
    });
    user.hasBankDetails = true;
    user.bankDetails = { accountNumber: '', ifsc: '', name: '' };
    user.razorpayContactId = null;
    user.razorpayFundAccountId = null;

    if (!user.artistApplication) user.artistApplication = {};
    user.artistApplication.status = 'pending';
    user.artistApplication.bio = body.bio;
    user.artistApplication.artStyle = body.artStyle;
    user.artistApplication.portfolioUrls = portfolioUrls;
    user.artistApplication.passportPhoto = req.file ? `uploads/${req.file.filename}` : '';
    user.artistApplication.appliedAt = new Date();

    await user.save();
    res.json(sanitizeUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message || 'Application failed' });
  }
};

exports.saveArtwork = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.savedArtworks.includes(req.params.artworkId)) {
    user.savedArtworks.push(req.params.artworkId);
    await user.save();
  }
  res.json({ message: 'Artwork saved', saved: user.savedArtworks });
};

exports.unsaveArtwork = async (req, res) => {
  const user = await User.findById(req.user._id);
  user.savedArtworks = user.savedArtworks.filter(id => id.toString() !== req.params.artworkId);
  await user.save();
  res.json({ message: 'Artwork unsaved', saved: user.savedArtworks });
};

exports.confirmOrderDelivery = async (req, res) => {
  res.json({ message: 'Order delivered' });
};

exports.markAsRead = async (req, res) => {
  res.json({ message: 'Message marked as read' });
};

exports.getArtistOrders = async (req, res) => {
  res.json([]);
};

exports.updateOrderStatus = async (req, res) => {
  res.json({ message: 'Order updated' });
};

exports.getArtistReports = async (req, res) => {
  res.json([]);
};

exports.getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.orderId)
    .populate('items.artwork')
    .populate('buyer', 'name email');

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Ensure the user is the buyer or the artist
  if (
    order.buyer._id.toString() !== req.user._id.toString() &&
    order.items.artwork.artist.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  res.json(order);
};
