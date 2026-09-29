const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

/**
 * Middleware xác thực cho socket: client phải gửi JWT qua `socket.handshake.auth.token`.
 */
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Thiếu token xác thực'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId;
    next();
  } catch {
    next(new Error('Token không hợp lệ'));
  }
}

function registerChatSocket(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`🔌 User ${socket.userId} đã kết nối`);

    User.findByIdAndUpdate(socket.userId, { status: 'online' }).exec();
    socket.broadcast.emit('user_status_changed', { userId: socket.userId, status: 'online' });

    // Client join vào room của từng conversation họ tham gia (gọi sau khi kết nối)
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    /**
     * Gửi tin nhắn — payload đã được mã hóa hybrid + ký số SẴN Ở CLIENT.
     * Server chỉ lưu và chuyển tiếp, không đọc được nội dung.
     *
     * payload: {
     *   conversationId,
     *   encryptedMessage: { iv, authTag, data },       // từ aes.encryptAES()
     *   recipientKeys: [{ recipient, encryptedKeyChunks }], // 1 bản/người nhận
     *   signature: { r, s },                            // từ signature.sign()
     *   attachments?: [{ url, filename, mimeType, sizeBytes, sha256 }]
     * }
     */
    socket.on('send_message', async (payload, ack) => {
      try {
        const { conversationId, encryptedMessage, recipientKeys, signature, attachments } = payload;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.some((p) => p.toString() === socket.userId)) {
          return ack?.({ error: 'Không có quyền gửi vào hội thoại này' });
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.userId,
          encryptedMessage,
          recipientKeys,
          signature,
          attachments: attachments || [],
        });

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Kèm elgamalPublicKey của người gửi để client nhận xác thực chữ ký được
        const populated = await message.populate('sender', 'username avatarUrl elgamalPublicKey');

        // Gửi cho tất cả thành viên trong room (bao gồm cả người gửi để đồng bộ nhiều thiết bị)
        io.to(`conversation:${conversationId}`).emit('new_message', populated);
        ack?.({ success: true, messageId: message._id });
      } catch (err) {
        console.error('Lỗi gửi tin nhắn:', err);
        ack?.({ error: 'Lỗi server khi gửi tin nhắn' });
      }
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', { userId: socket.userId });
    });

    socket.on('mark_read', async ({ messageId }) => {
      await Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: socket.userId } });
    });

    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(socket.userId, { status: 'offline', lastSeenAt: new Date() });
      socket.broadcast.emit('user_status_changed', { userId: socket.userId, status: 'offline' });
      console.log(`🔌 User ${socket.userId} đã ngắt kết nối`);
    });
  });
}

module.exports = registerChatSocket;
