const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multer');

router.use(authMiddleware);

router.put('/ship', upload.array('proofImages', 12), orderController.shipOrder);

router.put('/confirm-delivery/:orderId', orderController.confirmDelivery);

router.post('/', orderController.create);
router.get('/', orderController.getBuyerOrders);
router.get('/artist', orderController.getArtistOrders);

router.patch('/:orderId/status', orderController.updateStatus);
router.patch('/:orderId/confirm-delivery', orderController.confirmDelivery);
router.patch('/:orderId/cancel', orderController.cancelOrder);
router.get('/:orderId/receipt', orderController.downloadReceipt);

router.get('/:orderId', orderController.getOrderById);

module.exports = router;
