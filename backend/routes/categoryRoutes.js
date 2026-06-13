const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.get('/', categoryController.list);
router.get('/:slug', categoryController.getBySlug);

module.exports = router;
