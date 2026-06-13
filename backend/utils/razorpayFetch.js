/**
 * Minimal Razorpay REST helper (Basic auth) for endpoints not wrapped in the SDK (e.g. contacts, payouts).
 */
module.exports.razorpayPost = async (path, body) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys not configured');
  }
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.description || data?.message || JSON.stringify(data);
    throw new Error(msg);
  }
  return data;
};
