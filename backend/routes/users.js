const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// LẤY DANH SÁCH USERS
router.get('/', auth, async (req, res) => {
    try {
        const users = await User.find(
            { _id: { $ne: req.userId } },
            { password: 0, loginAttempts: 0, lockedUntil: 0 }
        ).sort({ nickname: 1, username: 1 });
        
        res.json(users);
        
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
});

module.exports = router;