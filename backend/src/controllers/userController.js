const User = require('../models/User');
const Conversation = require('../models/Conversation');

/** GET /api/users/search?q=... — tìm user hoặc hiện danh sách người dùng để kết bạn */
async function searchUsers(req, res) {
  const q = (req.query.q || '').trim();

  const FriendRequest = require('../models/FriendRequest');
  const currentUser = await User.findById(req.userId).select('friends');
  const friendsList = (currentUser?.friends || []).map((id) => id.toString());

  const filter = {
    _id: { $ne: req.userId },
  };

  if (q) {
    filter.username = { $regex: q, $options: 'i' };
  }

  const users = await User.find(filter)
    .select('username email avatarUrl status')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const userIds = users.map((u) => u._id);

  // Lấy các lời mời kết bạn liên quan
  const pendingRequests = await FriendRequest.find({
    status: 'pending',
    $or: [
      { sender: req.userId, receiver: { $in: userIds } },
      { sender: { $in: userIds }, receiver: req.userId },
    ],
  });

  const enrichedUsers = users.map((u) => {
    const isFriend = friendsList.includes(u._id.toString());
    const outgoing = pendingRequests.find(
      (r) => r.sender.toString() === req.userId && r.receiver.toString() === u._id.toString()
    );
    const incoming = pendingRequests.find(
      (r) => r.receiver.toString() === req.userId && r.sender.toString() === u._id.toString()
    );

    let friendshipStatus = 'none'; // none | friend | sent | received
    let requestId = null;

    if (isFriend) {
      friendshipStatus = 'friend';
    } else if (outgoing) {
      friendshipStatus = 'sent';
      requestId = outgoing._id;
    } else if (incoming) {
      friendshipStatus = 'received';
      requestId = incoming._id;
    }

    return {
      ...u,
      friendshipStatus,
      requestId,
    };
  });

  res.json(enrichedUsers);
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

/** GET /api/users/me/conversations — danh sách hội thoại của user hiện tại (tự động khử trùng lặp) */
async function myConversations(req, res) {
  try {
    const conversations = await Conversation.find({ participants: req.userId })
      .populate('participants', 'username avatarUrl status elgamalPublicKey')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    const uniqueConversations = [];
    const seenPrivatePartners = new Set();
    const duplicateIdsToDelete = [];

    for (const conv of conversations) {
      if (conv.type === 'private') {
        const other = conv.participants.find(
          (p) => p && p._id && p._id.toString() !== req.userId.toString()
        );
        if (other) {
          const partnerId = other._id.toString();
          if (seenPrivatePartners.has(partnerId)) {
            duplicateIdsToDelete.push(conv._id);
            continue;
          }
          seenPrivatePartners.add(partnerId);
        }
      }
      uniqueConversations.push(conv);
    }

    // Dọn dẹp ngầm các bản ghi cuộc hội thoại trùng lặp trong database
    if (duplicateIdsToDelete.length > 0) {
      Conversation.deleteMany({ _id: { $in: duplicateIdsToDelete } }).catch((err) =>
        console.error('Lỗi dọn dẹp conversation trùng lặp:', err)
      );
    }

    res.json(uniqueConversations);
  } catch (err) {
    console.error('Lỗi lấy danh sách hội thoại:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách hội thoại' });
  }
}

module.exports = { searchUsers, getPublicKey, myConversations };

