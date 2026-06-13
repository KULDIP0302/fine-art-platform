const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 16;

function getKey() {
  const raw = process.env.BANK_ENCRYPTION_KEY;
  if (!raw || String(raw).length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BANK_ENCRYPTION_KEY must be set in production (min 16 chars).');
    }
    return crypto.createHash('sha256').update('dev-insecure-bank-key-change-me', 'utf8').digest();
  }
  return crypto.createHash('sha256').update(String(raw), 'utf8').digest();
}

/**
 * @param {{ accountHolderName: string, accountNumber: string, ifsc: string }} payload
 */
exports.encryptBankPayload = (payload) => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const json = JSON.stringify({
    accountHolderName: String(payload.accountHolderName || '').trim(),
    accountNumber: String(payload.accountNumber || '').replace(/\s/g, ''),
    ifsc: String(payload.ifsc || '').replace(/\s/g, '').toUpperCase(),
  });
  const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: enc.toString('base64'),
  };
};

/**
 * @param {{ iv: string, tag: string, data: string }} enc
 * @returns {{ accountHolderName: string, accountNumber: string, ifsc: string }}
 */
exports.decryptBankPayload = (enc) => {
  if (!enc || !enc.iv || !enc.tag || !enc.data) {
    throw new Error('Missing encrypted bank payload');
  }
  const key = getKey();
  const iv = Buffer.from(enc.iv, 'base64');
  const tag = Buffer.from(enc.tag, 'base64');
  const data = Buffer.from(enc.data, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  const obj = JSON.parse(dec.toString('utf8'));
  return {
    accountHolderName: obj.accountHolderName,
    accountNumber: obj.accountNumber,
    ifsc: obj.ifsc,
  };
};

exports.maskAccountNumber = (num) => {
  const s = String(num || '').replace(/\s/g, '');
  if (s.length <= 4) return '****';
  return `****${s.slice(-4)}`;
};

exports.maskIfsc = (ifsc) => {
  const s = String(ifsc || '').replace(/\s/g, '').toUpperCase();
  if (s.length <= 4) return '****';
  return `****${s.slice(-4)}`;
};

exports.maskName = (name) => {
  const n = String(name || '').trim();
  if (n.length <= 2) return '****';
  return `${n[0]}${'*'.repeat(Math.min(n.length - 2, 8))}${n[n.length - 1]}`;
};
