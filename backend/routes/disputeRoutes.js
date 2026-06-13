const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multer');
const disputeController = require('../controllers/disputeController');

router.use(authMiddleware);

router.post('/', upload.array('images', 8), disputeController.createDispute);
router.get('/mine', disputeController.listMyDisputes);

module.exports = router;
