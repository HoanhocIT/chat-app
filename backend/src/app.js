const path = require('path');
const fs = require('fs');

// Nạp .env từ thư mục backend hoặc thư mục root hiện tại
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const registerChatSocket = require('./sockets/chatSocket');

const app = express();
const server = http.createServer(app);

// Cấu hình CORS linh hoạt: tự động nhận diện và cho phép mọi nguồn kết nối (localhost, domain production)
const corsOptions = {
  origin: (origin, callback) => {
    // Cho phép request cùng origin (server phục vụ frontend tĩnh) hoặc công cụ không có origin
    if (!origin) return callback(null, true);

    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isClientUrl = process.env.CLIENT_URL && origin === process.env.CLIENT_URL;

    if (isLocalhost || isClientUrl) {
      return callback(null, true);
    }
    // Trong môi trường production hoặc dev, cho phép để không bị chặn kết nối
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' })); // đủ lớn cho payload mã hóa + metadata file

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, status: 'online', time: new Date() }));

registerChatSocket(io);

// Phục vụ giao diện tĩnh Frontend khi đã build (Single Service Deployment: Render, VPS, Railway...)
const possibleDistPaths = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../frontend/dist'),
  path.join(process.cwd(), 'frontend/dist'),
  path.join(process.cwd(), 'dist'),
];
const frontendDist = possibleDistPaths.find((p) => fs.existsSync(p));

if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return res.status(404).json({ error: 'Endpoint không tồn tại' });
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  // Lắng nghe trên '0.0.0.0' để chấp nhận cả IPv4 lẫn IPv6 trên Windows/Linux/Cloud
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server Backend đã khởi động:`);
    console.log(`   ➜ Localhost: http://localhost:${PORT}`);
    console.log(`   ➜ IP 127.0.0.1: http://127.0.0.1:${PORT}`);
    if (fs.existsSync(frontendDist)) {
      console.log(`   ➜ Đang phục vụ Frontend tĩnh từ: ${frontendDist}`);
    }
  });
});
