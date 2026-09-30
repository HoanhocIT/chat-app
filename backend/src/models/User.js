/**
 * User.js
 * Lưu thông tin tài khoản và PUBLIC KEY ElGamal (để người khác mã hóa gửi cho user này).
 * Private key KHÔNG BAO GIỜ lưu ở server — chỉ tồn tại phía client.
 */

const mongoose = require('mongoose');

const ElGamalPublicKeySchema = new mongoose.Schema(
  {
    p: { type: String, required: true }, // số nguyên tố, lưu dạng chuỗi vì là BigInt
    g: { type: String, required: true }, // generator
    y: { type: String, required: true }, // khóa công khai (g^x mod p)
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true }, // bcrypt — KHÔNG dùng SHA-256/MD5 cho mật khẩu
    avatarUrl: { type: String, default: null },

    elgamalPublicKey: { type: ElGamalPublicKeySchema, required: true },

    status: { type: String, enum: ['online', 'offline'], default: 'offline' },
    lastSeenAt: { type: Date, default: Date.now },

    // Quên mật khẩu & Đặt lại mật khẩu
    resetPasswordOTP: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

// Không bao giờ trả passwordHash hay mã OTP ra ngoài API
UserSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.resetPasswordOTP;
  delete obj.resetPasswordExpires;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
