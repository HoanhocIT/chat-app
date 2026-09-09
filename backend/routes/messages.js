const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// GỬI TIN NHẮN
router.post('/send', auth, async (req, res) => {
    try {
        const { receiverId, encryptedMessage, encryptedAESKey, senderContent } = req.body;
        
        const newMessage = new Message({
            senderId: req.userId,
            receiverId,
            encryptedMessage: {
                iv: encryptedMessage.iv,
                encryptedData: encryptedMessage.encryptedData
            },
            encryptedAESKey: {
                a: encryptedAESKey.a,
                b: encryptedAESKey.b
            },
            senderContent: senderContent || ''
        });
        
        await newMessage.save();
        console.log('✅ Message saved via API:', newMessage._id);
        
        res.status(201).json(newMessage);
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
});

// LẤY LỊCH SỬ CHAT
router.get('/:userId', auth, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { senderId: req.userId, receiverId: req.params.userId },
                { senderId: req.params.userId, receiverId: req.userId }
            ]
        }).sort({ createdAt: 1 });
        
        console.log('📜 Trả về', messages.length, 'tin nhắn');
        
        res.json(messages);
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
});

module.exports = router;