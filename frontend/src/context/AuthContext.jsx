import { createContext, useContext, useEffect, useState } from 'react';
import http from '../api/http';
import { connectSocket, disconnectSocket } from '../api/socket';
import * as elgamal from '../crypto/elgamal';

const AuthContext = createContext(null);

/**
 * LƯU Ý BẢO MẬT (ghi rõ trong báo cáo đồ án):
 * Private key ElGamal được lưu trong localStorage của trình duyệt để đơn giản hóa demo.
 * Trong hệ thống thật, private key nên được mã hóa bằng passphrase của user trước khi
 * lưu (ví dụ: PBKDF2 từ mật khẩu + AES) để tránh lộ khi máy bị truy cập trái phép.
 * Đây cũng là lý do vì sao đăng nhập trên thiết bị MỚI sẽ không giải mã được tin nhắn
 * cũ — private key không đồng bộ qua server (đúng nguyên tắc E2E encryption).
 */
function savePrivateKey(userId, privateKey) {
  localStorage.setItem(`privateKey:${userId}`, JSON.stringify(privateKey));
}

function loadPrivateKey(userId) {
  const raw = localStorage.getItem(`privateKey:${userId}`);
  return raw ? JSON.parse(raw) : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setPrivateKey(loadPrivateKey(parsedUser._id));
      connectSocket(token);
    }
    setLoading(false);
  }, []);

  async function register({ username, email, password }) {
    // Sinh cặp khóa ElGamal NGAY TRÊN TRÌNH DUYỆT trước khi gửi gì lên server
    const { publicKey, privateKey: newPrivateKey } = elgamal.generateKeyPair(256);

    const { data } = await http.post('/auth/register', {
      username,
      email,
      password,
      elgamalPublicKey: publicKey,
    });

    savePrivateKey(data.user._id, newPrivateKey);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    setUser(data.user);
    setPrivateKey(newPrivateKey);
    connectSocket(data.token);
    return data.user;
  }

  async function login({ username, password }) {
    const { data } = await http.post('/auth/login', { username, password });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    setUser(data.user);
    setPrivateKey(loadPrivateKey(data.user._id)); // null nếu đăng nhập từ thiết bị mới
    connectSocket(data.token);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    setUser(null);
    setPrivateKey(null);
  }

  return (
    <AuthContext.Provider value={{ user, privateKey, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
