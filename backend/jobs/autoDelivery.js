const Order = require('../models/Order');
const { applyAutoDelivered } = require('../controllers/orderController');

module.exports.runAutoDelivery = async () => {
  const now = new Date();
  const orders = await Order.find({
    status: 'shipped',
    autoDeliverAt: { $ne: null, $lte: now },
    paymentStatus: 'paid',
  })
    .select('_id')
    .limit(200)
    .lean();

  for (const o of orders) {
    await applyAutoDelivered(o._id);
  }
};
