const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const {
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendsList,
} = require('../controllers/friendController');

const router = express.Router();

router.use(requireAuth);

router.get('/requests', getFriendRequests);
router.get('/list', getFriendsList);
router.post('/request/:targetUserId', sendFriendRequest);
router.put('/accept/:requestId', acceptFriendRequest);
router.put('/reject/:requestId', rejectFriendRequest);

module.exports = router;
