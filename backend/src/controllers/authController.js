const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RegisterOTP = require('../models/RegisterOTP');
const { sendResetPasswordEmail, sendRegistrationOtpEmail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'chat-app-secret-fallback-jwt-token-production-2026';

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * POST /api/auth/send-register-otp
 * Gửi mã OTP về email trước khi tạo tài khoản
 */
async function sendRegisterOtp(req, res) {
  try {
    const { email, username } = req.body;

    if (!email || !username) {
      return res.status(400).json({ error: 'Vui lòng cung cấp Tên hiển thị và Địa chỉ Email' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ error: 'Tên hiển thị phải từ 3 đến 30 ký tự' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Địa chỉ email không hợp lệ' });
    }

    // Kiểm tra xem username hoặc email đã tồn tại hay chưa
    const existingUser = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });
    if (existingUser) {
      if (existingUser.email === cleanEmail) {
        return res.status(409).json({ error: 'Địa chỉ email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.' });
      }
      return res.status(409).json({ error: 'Tên hiển thị này đã có người sử dụng. Vui lòng chọn tên khác.' });
    }

    // Sinh mã OTP 6 số ngẫu nhiên
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu vào database với TTL 15 phút
    await RegisterOTP.deleteMany({ email: cleanEmail });
    await RegisterOTP.create({
      email: cleanEmail,
      otp: otpCode,
    });

    const mailResult = await sendRegistrationOtpEmail(cleanEmail, cleanUsername, otpCode);

    res.json({
      ok: true,
      message: mailResult.simulated
        ? (mailResult.warning ? `Lưu ý: ${mailResult.warning}` : `Mã OTP đã được tạo (Mô phỏng: ${otpCode})`)
        : `Mã OTP xác thực đã được gửi tới email ${cleanEmail}. Vui lòng kiểm tra hộp thư!`,
      simulated: mailResult.simulated,
      demoOtp: mailResult.simulated ? otpCode : undefined,
    });
  } catch (err) {
    console.error('❌ Lỗi khi gửi OTP đăng ký:', err);
    res.status(500).json({ error: 'Lỗi server khi gửi mã OTP đăng ký: ' + (err.message || 'Lỗi không xác định') });
  }
}

/**
 * POST /api/auth/register
 * QUAN TRỌNG: client phải tự sinh cặp khóa ElGamal (elgamal.generateKeyPair())
 * TRƯỚC khi gọi API này, và chỉ gửi lên `elgamalPublicKey`. Private key giữ ở client,
 * không bao giờ gửi lên server.
 * Bắt buộc phải có mã OTP đã gửi qua email.
 */
async function register(req, res) {
  try {
    const { username, email, password, elgamalPublicKey, otp } = req.body;

    if (!username || !email || !password || !elgamalPublicKey) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (kể cả elgamalPublicKey)' });
    }
    if (!otp) {
      return res.status(400).json({ error: 'Vui lòng cung cấp mã xác thực OTP gửi về email' });
    }
    if (!elgamalPublicKey.p || !elgamalPublicKey.g || !elgamalPublicKey.y) {
      return res.status(400).json({ error: 'elgamalPublicKey phải có đủ { p, g, y }' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    // Xác thực mã OTP
    const validOtpRecord = await RegisterOTP.findOne({
      email: cleanEmail,
      otp: otp.trim(),
    });

    if (!validOtpRecord) {
      return res.status(400).json({ error: 'Mã xác thực OTP không chính xác hoặc đã hết hạn. Vui lòng nhận lại mã mới.' });
    }

    const existing = await User.findOne({ $or: [{ username: cleanUsername }, { email: cleanEmail }] });
    if (existing) {
      return res.status(409).json({ error: 'Username hoặc email đã được sử dụng' });
    }

    // Băm mật khẩu bằng bcrypt — KHÔNG dùng SHA-256/MD5 cho mật khẩu
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      elgamalPublicKey,
    });

    // Xóa mã OTP đã dùng
    await RegisterOTP.deleteMany({ email: cleanEmail });

    // Bắn realtime socket thông báo có người dùng mới đăng ký tới toàn bộ client
    const io = req.app.get('io');
    if (io) {
      io.emit('new_user_registered', user.toSafeJSON());
    }

    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (err) {
    console.error('❌ Lỗi khi đăng ký:', err);
    res.status(500).json({ error: 'Lỗi server khi đăng ký: ' + (err.message || 'Lỗi không xác định') });
  }
}

/** POST /api/auth/login */
async function login(req, res) {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập Email và Mật khẩu để đăng nhập' });
    }

    // Hỗ trợ đăng nhập bằng Email (ưu tiên) hoặc Username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    user.status = 'online';
    user.lastSeenAt = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    console.error('❌ Lỗi khi đăng nhập:', err);
    res.status(500).json({ error: 'Lỗi server khi đăng nhập: ' + (err.message || 'Lỗi không xác định') });
  }
}


/** POST /api/auth/forgot-password */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Vui lòng cung cấp địa chỉ email' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản với email này' });
    }

    // Sinh mã OTP 6 chữ số ngẫu nhiên
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    user.resetPasswordOTP = otpCode;
    user.resetPasswordExpires = expiryTime;
    await user.save();

    const { sendResetPasswordEmail } = require('../utils/mailer');
    const mailResult = await sendResetPasswordEmail(user.email, user.username, otpCode);

    res.json({
      ok: true,
      message: mailResult.simulated
        ? (mailResult.warning ? `Lưu ý: ${mailResult.warning}` : `Mã OTP đã được tạo (Mô phỏng: ${otpCode})`)
        : `Mã OTP xác thực đã được gửi tới email ${user.email}. Vui lòng kiểm tra hộp thư!`,
      simulated: mailResult.simulated,
      demoOtp: mailResult.simulated ? otpCode : undefined,
    });
  } catch (err) {
    console.error('❌ Lỗi khi gửi OTP quên mật khẩu:', err);
    res.status(500).json({ error: 'Lỗi server khi gửi email đặt lại mật khẩu: ' + err.message });
  }
}

/** POST /api/auth/reset-password */
async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (email, OTP, mật khẩu mới)' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    if (!user.resetPasswordOTP || user.resetPasswordOTP !== otp.trim()) {
      return res.status(400).json({ error: 'Mã OTP không chính xác' });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
    }

    // Băm mật khẩu mới bằng bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordHash = passwordHash;
    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      ok: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
    });
  } catch (err) {
    console.error('❌ Lỗi khi đặt lại mật khẩu:', err);
    res.status(500).json({ error: 'Lỗi server khi đặt lại mật khẩu: ' + err.message });
  }
}

module.exports = { register, login, forgotPassword, resetPassword, sendRegisterOtp };
