/** Normalize legacy status values to canonical */
exports.effectiveStatus = (order) => {
  const s = order.status;
  const paid = order.paymentStatus === 'paid';
  if (s === 'confirmed' && paid) return 'paid';
  if (s === 'pending' && paid) return 'paid';
  if (s === 'pending' && !paid) return 'pending_payment';
  return s;
};

exports.canCancel = (order) => {
  const st = exports.effectiveStatus(order);
  return (
    (st === 'pending_payment' || st === 'pending') &&
    order.paymentStatus !== 'paid'
  );
};

exports.DELIVERY_DAYS = Number(process.env.AUTO_DELIVER_DAYS || 7);
