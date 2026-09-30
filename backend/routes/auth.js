const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ĐĂNG KÝ
router.post('/register', async (req, res) => {
    try {
        const { username, password, publicKey, nickname } = req.body;
        
        console.log('📝 Đăng ký:', username, 'Nickname:', nickname);
        
        if (!username || !password || !publicKey) {
            return res.status(400).json({ message: 'Thiếu thông tin!' });
        }
        
        if (!publicKey.p || !publicKey.g || !publicKey.y) {
            return res.status(400).json({ message: 'Public key thiếu!' });
        }
        
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username đã tồn tại!' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({
            username,
            nickname: nickname || username,
            password: hashedPassword,
            publicKey: {
                p: publicKey.p,
                g: publicKey.g,
                y: publicKey.y
            }
        });
        
        await newUser.save();
        
        const token = jwt.sign(
            { userId: newUser._id, username: newUser.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            message: 'Đăng ký thành công!',
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                nickname: newUser.nickname,
                avatar: newUser.avatar,
                publicKey: newUser.publicKey,
                theme: newUser.theme
            }
        });
        
    } catch (error) {
        console.error('❌ Lỗi đăng ký:', error.message);
        res.status(500).json({ message: 'Lỗi: ' + error.message });
    }
});

// ĐĂNG NHẬP
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(400).json({ message: 'Username không tồn tại!' });
        }
        
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const mins = Math.ceil((user.lockedUntil - new Date()) / 60000);
            return res.status(403).json({ message: `Tài khoản bị khóa ${mins} phút!` });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            user.loginAttempts += 1;
            
            if (user.loginAttempts >= 5) {
                user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
                user.loginAttempts = 0;
                await user.save();
                return res.status(403).json({ message: 'Sai 5 lần! Khóa 15 phút!' });
            }
            
            await user.save();
            return res.status(400).json({ message: `Sai mật khẩu! Còn ${5 - user.loginAttempts} lần!` });
        }
        
        user.loginAttempts = 0;
        user.lockedUntil = null;
        user.isOnline = true;
        await user.save();
        
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Đăng nhập thành công!',
            token,
            user: {
                id: user._id,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar,
                publicKey: user.publicKey,
                theme: user.theme
            }
        });
        
    } catch (error) {
        console.error('❌ Lỗi đăng nhập:', error.message);
        res.status(500).json({ message: 'Lỗi: ' + error.message });
    }
});

// CẬP NHẬT THEME
router.put('/theme', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Không có token!' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { mode, chatColor } = req.body;
        
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại!' });
        }
        
        if (mode) user.theme.mode = mode;
        if (chatColor) user.theme.chatColor = chatColor;
        
        await user.save();
        
        res.json({ message: 'OK', theme: user.theme });
        
    } catch (error) {
        console.error('Lỗi theme:', error.message);
        res.status(500).json({ message: 'Lỗi: ' + error.message });
    }
});

module.exports = router;