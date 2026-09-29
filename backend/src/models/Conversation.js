/**
 * Conversation.js
 * Đại diện cho 1 cuộc trò chuyện — có thể là chat 1-1 hoặc nhóm.
 */

const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['private', 'group'], default: 'private' },
    name: { type: String, default: null }, // chỉ dùng cho group chat

    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ],

    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Tăng tốc truy vấn "lấy danh sách hội thoại của 1 user, sắp theo mới nhất"
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
