const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

/**
 * GET /api/friends/requests
 * Lấy danh sách lời mời kết bạn gửi đến tôi (received) và lời mời tôi đã gửi đi (sent).
 */
async function getFriendRequests(req, res) {
  try {
    const received = await FriendRequest.find({
      receiver: req.userId,
      status: 'pending',
    })
      .populate('sender', 'username email avatarUrl status elgamalPublicKey')
      .sort({ createdAt: -1 });

    const sent = await FriendRequest.find({
      sender: req.userId,
      status: 'pending',
    })
      .populate('receiver', 'username email avatarUrl status elgamalPublicKey')
      .sort({ createdAt: -1 });

    res.json({ received, sent });
  } catch (err) {
    console.error('Lỗi lấy danh sách lời mời kết bạn:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy lời mời kết bạn' });
  }
}

/**
 * POST /api/friends/request/:targetUserId
 * Gửi lời mời kết bạn tới một user khác.
 */
async function sendFriendRequest(req, res) {
  try {
    const targetUserId = req.params.targetUserId;
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Không thể gửi lời mời kết bạn cho chính mình' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    // Kiểm tra đã là bạn bè chưa
    const currentUser = await User.findById(req.userId);
    if (currentUser.friends && currentUser.friends.some((f) => f.toString() === targetUserId)) {
      return res.status(400).json({ error: 'Hai bạn đã là bạn bè rồi' });
    }

    // Kiểm tra xem đã có lời mời kết bạn đang chờ không
    const existing = await FriendRequest.findOne({
      $or: [
        { sender: req.userId, receiver: targetUserId, status: 'pending' },
        { sender: targetUserId, receiver: req.userId, status: 'pending' },
      ],
    });

    if (existing) {
      if (existing.sender.toString() === req.userId) {
        return res.status(400).json({ error: 'Bạn đã gửi lời mời kết bạn rồi, vui lòng chờ phản hồi' });
      } else {
        return res.status(400).json({ error: 'Đối phương đã gửi lời mời cho bạn, hãy chấp nhận lời mời' });
      }
    }

    const newRequest = await FriendRequest.create({
      sender: req.userId,
      receiver: targetUserId,
      status: 'pending',
    });

    const populated = await newRequest.populate('sender', 'username email avatarUrl status elgamalPublicKey');

    // Bắn realtime socket nếu có io gắn vào app
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetUserId}`).emit('friend_request_received', populated);
      io.to(`user:${req.userId}`).emit('friend_request_sent', populated);
      io.emit('friendship_status_changed', { user1: req.userId, user2: targetUserId, status: 'sent' });
    }

    res.status(201).json({ success: true, request: populated });
  } catch (err) {
    console.error('Lỗi gửi lời mời kết bạn:', err);
    res.status(500).json({ error: 'Lỗi server khi gửi lời mời kết bạn' });
  }
}

/**
 * PUT /api/friends/accept/:requestId
 * Chấp nhận lời mời kết bạn: Thêm vào danh sách friends và tự động tạo conversation 1-1.
 */
async function acceptFriendRequest(req, res) {
  try {
    const requestId = req.params.requestId;
    const request = await FriendRequest.findOne({
      _id: requestId,
      receiver: req.userId,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ error: 'Lời mời kết bạn không tồn tại hoặc đã được xử lý' });
    }

    request.status = 'accepted';
    await request.save();

    // Thêm vào danh sách bạn bè của nhau
    await User.findByIdAndUpdate(req.userId, { $addToSet: { friends: request.sender } });
    await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: req.userId } });

    // Tự động tạo / tìm cuộc hội thoại 1-1 giữa 2 người
    let conversation = await Conversation.findOne({
      type: 'private',
      participants: { $all: [req.userId, request.sender], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'private',
        participants: [req.userId, request.sender],
      });
    }

    const populatedConv = await conversation.populate(
      'participants',
      'username avatarUrl status elgamalPublicKey'
    );

    // Bắn realtime socket thông báo cho cả 2 người
    const io = req.app.get('io');
    if (io) {
      const acceptor = await User.findById(req.userId).select('username avatarUrl status elgamalPublicKey');
      const senderUser = await User.findById(request.sender).select('username avatarUrl status elgamalPublicKey');
      io.to(`user:${request.sender}`).emit('friend_request_accepted', {
        requestId,
        friend: acceptor,
        conversation: populatedConv,
      });
      io.to(`user:${req.userId}`).emit('friend_request_accepted', {
        requestId,
        friend: senderUser,
        conversation: populatedConv,
      });
      io.emit('friendship_status_changed', { user1: req.userId, user2: request.sender.toString(), status: 'friend' });
    }

    res.json({
      success: true,
      conversation: populatedConv,
      message: 'Đã chấp nhận lời mời kết bạn',
    });
  } catch (err) {
    console.error('Lỗi chấp nhận kết bạn:', err);
    res.status(500).json({ error: 'Lỗi server khi chấp nhận kết bạn' });
  }
}

/**
 * PUT /api/friends/reject/:requestId
 * Từ chối lời mời kết bạn.
 */
async function rejectFriendRequest(req, res) {
  try {
    const requestId = req.params.requestId;
    const request = await FriendRequest.findOne({
      _id: requestId,
      receiver: req.userId,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ error: 'Lời mời kết bạn không tồn tại hoặc đã xử lý' });
    }

    request.status = 'rejected';
    await request.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${request.sender}`).emit('friend_request_rejected', { requestId });
      io.emit('friendship_status_changed', { user1: req.userId, user2: request.sender.toString(), status: 'none' });
    }

    res.json({ success: true, message: 'Đã từ chối lời mời kết bạn' });
  } catch (err) {
    console.error('Lỗi từ chối kết bạn:', err);
    res.status(500).json({ error: 'Lỗi server khi từ chối kết bạn' });
  }
}

/**
 * GET /api/friends/list
 * Lấy danh sách bạn bè chính thức của tôi.
 */
async function getFriendsList(req, res) {
  try {
    const user = await User.findById(req.userId).populate(
      'friends',
      'username email avatarUrl status elgamalPublicKey lastSeenAt'
    );
    res.json(user.friends || []);
  } catch (err) {
    console.error('Lỗi lấy danh sách bạn bè:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách bạn bè' });
  }
}

/**
 * DELETE /api/friends/:friendId
 * Hủy kết bạn (Xóa bạn bè).
 */
async function unfriend(req, res) {
  try {
    const friendId = req.params.friendId;
    if (!friendId) {
      return res.status(400).json({ error: 'Thiếu friendId' });
    }

    await User.findByIdAndUpdate(req.userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: req.userId } });

    await FriendRequest.deleteMany({
      $or: [
        { sender: req.userId, receiver: friendId },
        { sender: friendId, receiver: req.userId },
      ],
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${friendId}`).emit('friend_removed', { friendId: req.userId });
      io.to(`user:${req.userId}`).emit('friend_removed', { friendId });
      io.emit('friendship_status_changed', { user1: req.userId, user2: friendId, status: 'none' });
    }

    res.json({ success: true, message: 'Đã hủy kết bạn thành công' });
  } catch (err) {
    console.error('Lỗi hủy kết bạn:', err);
    res.status(500).json({ error: 'Lỗi server khi hủy kết bạn' });
  }
}

module.exports = {
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendsList,
  unfriend,
};
