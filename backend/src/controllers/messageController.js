const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

/** GET /api/conversations/:id/messages */
async function getMessages(req, res) {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation || !conversation.participants.some((p) => p.toString() === req.userId)) {
    return res.status(403).json({ error: 'Không có quyền xem hội thoại này' });
  }

  const messages = await Message.find({ conversation: req.params.id })
    .populate('sender', 'username avatarUrl elgamalPublicKey')
    .sort({ createdAt: 1 })
    .limit(200);

  res.json(messages);
}

module.exports = { getMessages };
