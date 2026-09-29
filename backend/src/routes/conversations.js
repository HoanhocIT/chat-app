const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { createConversation, getConversation } = require('../controllers/conversationController');
const { getMessages } = require('../controllers/messageController');

const router = express.Router();

router.use(requireAuth);
router.post('/', createConversation);
router.get('/:id', getConversation);
router.get('/:id/messages', getMessages);

module.exports = router;
