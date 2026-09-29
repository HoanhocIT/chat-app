const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * POST /api/auth/register
 * QUAN TRỌNG: client phải tự sinh cặp khóa ElGamal (elgamal.generateKeyPair())
 * TRƯỚC khi gọi API này, và chỉ gửi lên `elgamalPublicKey`. Private key giữ ở client,
 * không bao giờ gửi lên server.
 */
async function register(req, res) {
  try {
    const { username, email, password, elgamalPublicKey } = req.body;

    if (!username || !email || !password || !elgamalPublicKey) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (kể cả elgamalPublicKey)' });
    }
    if (!elgamalPublicKey.p || !elgamalPublicKey.g || !elgamalPublicKey.y) {
      return res.status(400).json({ error: 'elgamalPublicKey phải có đủ { p, g, y }' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ error: 'Username hoặc email đã được sử dụng' });
    }

    // Băm mật khẩu bằng bcrypt — KHÔNG dùng SHA-256/MD5 cho mật khẩu
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email,
      passwordHash,
      elgamalPublicKey,
    });

    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi đăng ký' });
  }
}

/** POST /api/auth/login */
async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Thiếu username hoặc password' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Sai username hoặc mật khẩu' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Sai username hoặc mật khẩu' });
    }

    user.status = 'online';
    user.lastSeenAt = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
  }
}

module.exports = { register, login };
