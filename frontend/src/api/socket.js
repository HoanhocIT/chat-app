import { io } from 'socket.io-client';
import { getApiUrl } from './http';

let socket = null;

export function connectSocket(token) {
  const targetUrl = getApiUrl();

  // Nếu socket đã kết nối và token không đổi, dùng lại
  if (socket && socket.connected) {
    return socket;
  }

  // Nếu socket cũ đang đóng hoặc chưa ngắt, dọn dẹp trước khi tạo mới
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(targetUrl, {
    auth: { token },
    transports: ['websocket', 'polling'], // Tự động fallback sang polling nếu websocket bị chặn
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log(`🔌 [Socket.io] Kết nối thành công tới máy chủ: ${targetUrl}`);
  });

  socket.on('connect_error', (err) => {
    console.warn(`⚠️ [Socket.io] Lỗi kết nối tới ${targetUrl}:`, err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 [Socket.io] Đã ngắt kết nối (${reason})`);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
