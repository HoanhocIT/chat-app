const Conversation = require('../models/Conversation');

/**
 * POST /api/conversations
 * body: { participantIds: string[], type?: 'private' | 'group', name?: string }
 * Với chat 1-1: nếu đã tồn tại conversation giữa 2 người thì trả về cái cũ, không tạo trùng.
 */
async function createConversation(req, res) {
  const { participantIds, type = 'private', name } = req.body;

  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    return res.status(400).json({ error: 'Cần ít nhất 1 người tham gia khác' });
  }

  const allParticipants = [...new Set([req.userId, ...participantIds])];

  if (type === 'private' && allParticipants.length === 2) {
    const existing = await Conversation.findOne({
      type: 'private',
      participants: { $all: allParticipants, $size: 2 },
    });
    if (existing) return res.json(existing);
  }

  const conversation = await Conversation.create({
    type,
    name: type === 'group' ? name : null,
    participants: allParticipants,
  });

  res.status(201).json(conversation);
}

/** GET /api/conversations/:id — lấy chi tiết hội thoại kèm public key của mọi thành viên */
async function getConversation(req, res) {
  const conversation = await Conversation.findById(req.params.id).populate(
    'participants',
    'username avatarUrl status elgamalPublicKey'
  );

  if (!conversation || !conversation.participants.some((p) => p._id.toString() === req.userId)) {
    return res.status(403).json({ error: 'Không có quyền xem hội thoại này' });
  }

  res.json(conversation);
}

module.exports = { createConversation, getConversation };
