const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { createConversation, getConversation } = require('../controllers/conversationController');
const {
  getMessages,
  deleteMessageForMe,
  deleteMessageForEveryone,
} = require('../controllers/messageController');

const router = express.Router();

router.use(requireAuth);
router.post('/', createConversation);
router.get('/:id', getConversation);
router.get('/:id/messages', getMessages);
router.put('/:id/messages/:messageId/delete-for-me', deleteMessageForMe);
router.put('/:id/messages/:messageId/delete-for-everyone', deleteMessageForEveryone);

module.exports = router;
