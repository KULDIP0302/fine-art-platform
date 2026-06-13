const Category = require('../models/Category');

exports.list = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list categories.' });
  }
};

exports.getBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }
    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get category.' });
  }
};

exports.add = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required.' });
    }
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: 'Category with this name already exists.' });
    }
    const category = await Category.create({
      name: name.trim(),
      slug,
      description: description ? description.trim() : '',
    });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to add category.' });
  }
};

exports.edit = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description } = req.body;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }
    if (name != null && name.trim()) {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const existing = await Category.findOne({ slug, _id: { $ne: categoryId } });
      if (existing) {
        return res.status(400).json({ message: 'Category with this name already exists.' });
      }
      category.name = name.trim();
      category.slug = slug;
    }
    if (description != null) category.description = description.trim();
    await category.save();
    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to edit category.' });
  }
};

exports.delete = async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }
    await category.deleteOne();
    res.status(200).json({ message: 'Category deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete category.' });
  }
};
