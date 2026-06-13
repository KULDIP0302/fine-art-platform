const Artwork = require('../models/Artwork');
const User = require('../models/User');
const Report = require('../models/Report');

const isApprovedArtist = (user) => {
  return user.artistApplication && user.artistApplication.status === 'approved';
};

exports.create = async (req, res) => {
  try {
    const fullUser = await User.findById(req.user._id);
    if (!isApprovedArtist(fullUser)) {
      return res.status(403).json({ message: 'Only verified artists can upload artworks.' });
    }
    const { title, image, price, category } = req.body;
    const { description = '' } = req.body;
    if (!title || !image || price == null || !category) {
      return res.status(400).json({ message: 'Title, image, price and category are required.' });
    }
    const artwork = await Artwork.create({
      title,
      description,
      image,
      price: Number(price),
      category,
      artist: req.user._id,
      status: 'active',
    });
    const populated = await Artwork.findById(artwork._id)
      .populate('category', 'name slug')
      .populate('artist', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create artwork.' });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    const fullUser = await User.findById(req.user._id);
    if (!isApprovedArtist(fullUser)) {
      return res.status(403).json({ message: 'Only verified artists can upload artwork images.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required.' });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to upload artwork image.' });
  }
};

exports.list = async (req, res) => {
  try {
    const { category, artist, status, minPrice, maxPrice, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    const q = search != null ? String(search).trim() : '';
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    // If artist=true and authenticated, fetch current user's artworks
    if (artist === 'true' && req.user) {
      filter.artist = req.user._id;
    } else if (artist && artist !== 'true') {
      filter.artist = artist;
    }

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (minPrice != null || maxPrice != null) {
      filter.price = {};
      if (minPrice != null) filter.price.$gte = Number(minPrice);
      if (maxPrice != null) filter.price.$lte = Number(maxPrice);
    }
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const [artworks, total] = await Promise.all([
      Artwork.find(filter)
        .populate('category', 'name slug')
        .populate('artist', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Artwork.countDocuments(filter),
    ]);
    res.status(200).json({ artworks, total, page: parseInt(page, 10), limit: limitNum });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list artworks.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.artworkId)
      .populate('category', 'name slug description')
      .populate('artist', 'name email profilePic updatedAt');
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found.' });
    }
    res.status(200).json(artwork);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get artwork.' });
  }
};

exports.update = async (req, res) => {
  try {
    const fullUser = await User.findById(req.user._id);
    if (!isApprovedArtist(fullUser)) {
      return res.status(403).json({ message: 'Only verified artists can update artworks.' });
    }
    const artwork = await Artwork.findOne({ _id: req.params.artworkId, artist: req.user._id });
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found or you are not the artist.' });
    }
    const { title, image, price, category, description } = req.body;
    if (title != null) artwork.title = title;
    if (description != null) artwork.description = description;
    if (image != null) artwork.image = image;
    if (price != null) artwork.price = Number(price);
    if (category != null) artwork.category = category;
    await artwork.save();
    const populated = await Artwork.findById(artwork._id)
      .populate('category', 'name slug')
      .populate('artist', 'name email');
    res.status(200).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update artwork.' });
  }
};

exports.delete = async (req, res) => {
  try {
    const fullUser = await User.findById(req.user._id);
    if (!isApprovedArtist(fullUser)) {
      return res.status(403).json({ message: 'Only verified artists can delete artworks.' });
    }
    const artwork = await Artwork.findOne({ _id: req.params.artworkId, artist: req.user._id });
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found or you are not the artist.' });
    }
    await artwork.deleteOne();
    res.status(200).json({ message: 'Artwork deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete artwork.' });
  }
};

exports.report = async (req, res) => {
  try {
    const { artworkId } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason is required.' });
    }
    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found.' });
    }
    const report = await Report.create({
      artwork: artworkId,
      reportedBy: req.user._id,
      reason: reason.trim(),
    });
    const populated = await Report.findById(report._id)
      .populate('artwork', 'title image')
      .populate('reportedBy', 'name email');
    res.status(201).json({ message: 'Report submitted.', report: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Report failed.' });
  }
};
