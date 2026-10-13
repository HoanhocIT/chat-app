const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

/** GET /api/conversations/:id/messages */
async function getMessages(req, res) {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.participants.some((p) => p.toString() === req.userId)) {
      return res.status(403).json({ error: 'Không có quyền xem hội thoại này' });
    }

    // Không lấy những tin nhắn mà user hiện tại đã chọn "Xóa ở phía tôi"
    const messages = await Message.find({
      conversation: req.params.id,
      deletedFor: { $ne: req.userId },
    })
      .populate('sender', 'username avatarUrl elgamalPublicKey')
      .sort({ createdAt: 1 })
      .limit(300);

    res.json(messages);
  } catch (err) {
    console.error('Lỗi lấy tin nhắn:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy tin nhắn' });
  }
}

/** PUT /api/conversations/:id/messages/:messageId/delete-for-me */
async function deleteMessageForMe(req, res) {
  try {
    const { id: conversationId, messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, conversation: conversationId });
    if (!message) {
      return res.status(404).json({ error: 'Tin nhắn không tồn tại' });
    }

    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: req.userId },
    });

    res.json({ success: true, messageId });
  } catch (err) {
    console.error('Lỗi xóa tin nhắn phía tôi:', err);
    res.status(500).json({ error: 'Lỗi server khi xóa tin nhắn' });
  }
}

/** PUT /api/conversations/:id/messages/:messageId/delete-for-everyone */
async function deleteMessageForEveryone(req, res) {
  try {
    const { id: conversationId, messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, conversation: conversationId });
    if (!message) {
      return res.status(404).json({ error: 'Tin nhắn không tồn tại' });
    }

    // Chỉ người gửi tin nhắn mới được phép xóa/thu hồi ở phía mọi người
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ error: 'Bạn chỉ có thể thu hồi tin nhắn do chính bạn gửi' });
    }

    message.deletedForEveryone = true;
    message.attachments = [];
    await message.save();

    // Bắn realtime socket tới toàn bộ thành viên trong cuộc hội thoại
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message_deleted_for_everyone', {
        messageId,
        conversationId,
      });
    }

    res.json({ success: true, messageId });
  } catch (err) {
    console.error('Lỗi thu hồi tin nhắn phía mọi người:', err);
    res.status(500).json({ error: 'Lỗi server khi thu hồi tin nhắn' });
  }
}

module.exports = {
  getMessages,
  deleteMessageForMe,
  deleteMessageForEveryone,
};
