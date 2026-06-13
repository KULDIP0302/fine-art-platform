const express = require('express');
const router = express.Router();
const artworkController = require('../controllers/artworkController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multer');

// PUBLIC ROUTES
router.get('/', artworkController.list);
router.get('/:artworkId', artworkController.getById);

// PROTECTED ROUTES
router.use(authMiddleware);

router.post('/upload', upload.single('image'), artworkController.uploadImage);
router.post('/', artworkController.create);
router.put('/:artworkId', artworkController.update);
router.delete('/:artworkId', artworkController.delete);
router.post('/:artworkId/report', artworkController.report);

module.exports = router;
