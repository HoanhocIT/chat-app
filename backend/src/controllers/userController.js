const User = require('../models/User');
const Conversation = require('../models/Conversation');

/** GET /api/users/search?q=... — tìm user theo username để bắt đầu chat */
async function searchUsers(req, res) {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  const users = await User.find({
    username: { $regex: q, $options: 'i' },
    _id: { $ne: req.userId },
  })
    .select('username avatarUrl status')
    .limit(20);

  res.json(users);
}

/**
 * GET /api/users/:id/public-key
 * Lấy public key ElGamal của 1 user để mã hóa tin nhắn gửi cho họ.
 */
async function getPublicKey(req, res) {
  const user = await User.findById(req.params.id).select('username elgamalPublicKey');
  if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });

  res.json({
    userId: user._id,
    username: user.username,
    elgamalPublicKey: user.elgamalPublicKey,
  });
}

/** GET /api/users/me/conversations — danh sách hội thoại của user hiện tại */
async function myConversations(req, res) {
  const conversations = await Conversation.find({ participants: req.userId })
    .populate('participants', 'username avatarUrl status elgamalPublicKey')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });

  res.json(conversations);
}

module.exports = { searchUsers, getPublicKey, myConversations };
