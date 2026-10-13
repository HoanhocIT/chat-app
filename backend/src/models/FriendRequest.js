const mongoose = require('mongoose');

const FriendRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Đảm bảo không gửi trùng lời mời kết bạn đang chờ giữa 2 người
FriendRequestSchema.index({ sender: 1, receiver: 1, status: 1 });

module.exports = mongoose.model('FriendRequest', FriendRequestSchema);
