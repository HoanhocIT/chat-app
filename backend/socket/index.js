const Message = require('../models/Message');
const User = require('../models/User');

const onlineUsers = new Map();

function initializeSocket(io) {
    io.on('connection', (socket) => {
        console.log('🔌 Socket connected:', socket.id);
        
        socket.on('user-online', async (userId) => {
            onlineUsers.set(userId, socket.id);
            socket.userId = userId;
            await User.findByIdAndUpdate(userId, { isOnline: true });
            io.emit('user-status-change', { userId, isOnline: true });
            console.log('✅ User online:', userId);
        });
        
        socket.on('send-message', async (data) => {
            try {
                console.log('📨 Nhận send-message:', data);
                
                const { receiverId, encryptedMessage, encryptedAESKey, senderContent } = data;
                const senderId = socket.userId;
                
                if (!senderId) {
                    console.error('❌ Không có senderId!');
                    return;
                }
                
                if (!receiverId || !encryptedMessage || !encryptedAESKey) {
                    console.error('❌ Thiếu thông tin!');
                    return;
                }
                
                const newMessage = new Message({
                    senderId,
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
                console.log('✅ Message đã lưu vào MongoDB:', newMessage._id);
                
                const receiverSocketId = onlineUsers.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receive-message', newMessage);
                    console.log('✅ Đã gửi cho người nhận');
                }
                
                socket.emit('message-sent', newMessage);
                
            } catch (error) {
                console.error('❌ Lỗi lưu message:', error);
                socket.emit('message-error', { message: error.message });
            }
        });
        
        socket.on('disconnect', async () => {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                await User.findByIdAndUpdate(socket.userId, { isOnline: false });
                io.emit('user-status-change', { userId: socket.userId, isOnline: false });
            }
        });
    });
}

module.exports = { initializeSocket, onlineUsers };