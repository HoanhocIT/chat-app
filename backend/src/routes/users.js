const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { searchUsers, getPublicKey, myConversations } = require('../controllers/userController');

const router = express.Router();

router.use(requireAuth); // mọi route bên dưới đều cần đăng nhập

router.get('/search', searchUsers);
router.get('/me/conversations', myConversations);
router.get('/:id/public-key', getPublicKey);

module.exports = router;
