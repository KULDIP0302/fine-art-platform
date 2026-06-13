const { decryptBankPayload, maskAccountNumber, maskIfsc, maskName } = require('./bankCrypto');

/**
 * Never send encrypted blob or plaintext bank fields to clients — only masked summary.
 */
exports.sanitizeUser = (user) => {
  if (!user) return null;
  const enc = user.bankDetailsEnc;
  const legacy = user.bankDetails;

  const o = user.toObject ? user.toObject({ getters: true }) : { ...user };
  delete o.password;
  delete o.bankDetailsEnc;
  delete o.resetOTP;
  delete o.resetOTPExpiry;
  delete o.changePasswordOTP;
  delete o.changePasswordOTPExpiry;
  delete o.bankDetails;

  let bankDetailsMasked = null;

  if (o.hasBankDetails && enc && enc.iv) {
    try {
      const plain = decryptBankPayload(enc);
      bankDetailsMasked = {
        accountHolderName: maskName(plain.accountHolderName),
        accountNumber: maskAccountNumber(plain.accountNumber),
        ifsc: maskIfsc(plain.ifsc),
      };
    } catch {
      bankDetailsMasked = {
        accountHolderName: '****',
        accountNumber: '****',
        ifsc: '****',
      };
    }
  } else if (legacy && (legacy.accountNumber || legacy.ifsc)) {
    bankDetailsMasked = {
      accountHolderName: legacy.name ? maskName(legacy.name) : '****',
      accountNumber: maskAccountNumber(legacy.accountNumber),
      ifsc: maskIfsc(legacy.ifsc),
    };
  }

  o.bankDetailsMasked = bankDetailsMasked;

  if (Array.isArray(o.following)) {
    o.following = o.following.map((id) => (id && id.toString ? id.toString() : String(id)));
  }

  if (o.updatedAt) {
    o.profilePicVersion = new Date(o.updatedAt).getTime();
  }

  delete o.followers;

  return o;
};

