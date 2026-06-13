const nodemailer = require('nodemailer');

const log = (msg, extra) => {
  const line = `[email] ${msg}`;
  if (extra) console.log(line, extra);
  else console.log(line);
};

const createTransport = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== 'false' && port === 465;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    log('WARN: EMAIL_USER/EMAIL_PASS (or SMTP_USER/SMTP_PASS) not set — OTP emails will not send.');
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV !== 'production',
  });

  return transporter;
};

let _transporter;
const getTransport = () => {
  if (!_transporter) _transporter = createTransport();
  return _transporter;
};

/** 6-digit OTP */
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (email, otp, type = 'reset') => {
  log(`Preparing OTP email to=${email} type=${type}`);

  const subject =
    type === 'reset'
      ? 'Password reset OTP — FineArt'
      : 'Change password OTP — FineArt';

  const message =
    type === 'reset'
      ? `Your password reset OTP is: <strong>${otp}</strong>. Valid for 10 minutes.`
      : `Your change-password OTP is: <strong>${otp}</strong>. Valid for 10 minutes.`;

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@fineart.local';

  const mailOptions = {
    from: `"FineArt" <${from}>`,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${type === 'reset' ? 'Password reset' : 'Change password'}</h2>
        <p>Hello,</p>
        <p>${message}</p>
        <p style="color:#666;font-size:14px;">If you did not request this, ignore this email.</p>
      </div>
    `,
    text: type === 'reset'
      ? `Password reset OTP: ${otp} (10 min)`
      : `Change password OTP: ${otp} (10 min)`,
  };

  const transport = getTransport();
  if (!transport) {
    log('DEV: no transporter; printing OTP to console only', { email, otp });
    throw new Error(
      'Email not configured. Set EMAIL_USER and EMAIL_PASS (Gmail App Password) in backend/.env'
    );
  }

  try {
    const info = await transport.sendMail(mailOptions);
    log(`OTP email sent ok messageId=${info.messageId}`);
    return true;
  } catch (err) {
    console.error('[email] sendMail FAILED:', err.message, err.response || '');
    throw new Error(
      `Failed to send OTP: ${err.message}. Check SMTP_HOST/SMTP_PORT/EMAIL_USER/EMAIL_PASS in .env`
    );
  }
};

module.exports = { generateOTP, sendOTPEmail, createTransport };
