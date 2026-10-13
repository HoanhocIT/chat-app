const mongoose = require('mongoose');

/**
 * Model lưu mã OTP xác thực đăng ký tạm thời.
 * Tự động hết hạn sau 15 phút nhờ MongoDB TTL index.
 */
const RegisterOTPSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 900 },
});

module.exports = mongoose.model('RegisterOTP', RegisterOTPSchema);
