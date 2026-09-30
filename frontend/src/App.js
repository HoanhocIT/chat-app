import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Crypto from './crypto';
import './App.css';

const API_URL = 'https://chat-app-backend.onrender.com';
const SOCKET_URL = 'https://chat-app-backend.onrender.com';

const CHAT_COLORS = [
    '#0084FF', '#4CAF50', '#FF5722', '#9C27B0', '#FF9800',
    '#E91E63', '#00BCD4', '#795548', '#607D8B', '#FF4081',
    '#3F51B5', '#009688'
];

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [token, setToken] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [socket, setSocket] = useState(null);
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchUser, setSearchUser] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [filteredMessages, setFilteredMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchMessage, setSearchMessage] = useState('');
    const [theme, setTheme] = useState({ mode: 'light', chatColor: '#0084FF' });
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState({});
    const [showStats, setShowStats] = useState(false);
    const [cryptoStats, setCryptoStats] = useState({
        encryptTime: 0,
        decryptTime: 0,
        originalSize: 0,
        encryptedSize: 0,
        ratio: 0,
        securityLevel: 'Cao (AES-256 + ElGamal 512-bit)'
    });
    const [flowers] = useState(() => {
        const emojis = ['🌸', '🌺', '🌷', '🌹', '💮'];
        return Array.from({ length: 15 }, () => ({
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            left: Math.random() * 100 + '%',
            duration: (Math.random() * 5 + 5) + 's',
            delay: (Math.random() * 5) + 's',
            size: (Math.random() * 15 + 12) + 'px'
        }));
    });
    const [mouseFlowers, setMouseFlowers] = useState([]);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const messagesEndRef = useRef(null);

    const getToken = () => {
        return window.localStorage.getItem('token') || window.sessionStorage.getItem('token');
    };

    const getPrivateKey = () => {
        try {
            const keyStr = window.localStorage.getItem('privateKey');
            if (!keyStr || keyStr === 'null' || keyStr === 'undefined') {
                return null;
            }
            const key = JSON.parse(keyStr);
            if (!key || !key.p || !key.x) {
                return null;
            }
            return key;
        } catch (err) {
            return null;
        }
    };

    const handleMouseMove = (e) => {
        const emojis = ['🌸', '🌺', '💮'];
        const flower = {
            x: e.clientX,
            y: e.clientY,
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            size: (Math.random() * 12 + 8) + 'px'
        };
        
        setMouseFlowers(prev => [...prev, flower]);
        
        setTimeout(() => {
            setMouseFlowers(prev => prev.slice(1));
        }, 500);
    };

    useEffect(() => {
        if (isLoggedIn && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }, [isLoggedIn]);

    useEffect(() => {
        const savedToken = getToken();
        const savedUser = window.localStorage.getItem('currentUser') || window.sessionStorage.getItem('currentUser');
        
        if (savedToken && savedUser) {
            try {
                const user = JSON.parse(savedUser);
                setToken(savedToken);
                setCurrentUser(user);
                setIsLoggedIn(true);
            } catch (err) {}
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, filteredMessages]);

    useEffect(() => {
        if (isLoggedIn && currentUser) {
            const newSocket = io(SOCKET_URL);
            setSocket(newSocket);

            newSocket.on('connect', () => {
                newSocket.emit('user-online', currentUser.id);
            });

            newSocket.on('receive-message', (message) => {
    try {
        const privateKey = getPrivateKey();
        
        if (!privateKey) return;
        
        const startDecrypt = performance.now();
        
        const content = Crypto.decryptMessage(
            message.encryptedMessage,
            message.encryptedAESKey,
            privateKey
        );
        
        const endDecrypt = performance.now();
        const decryptTime = (endDecrypt - startDecrypt).toFixed(2);
        
        setCryptoStats(prev => ({ ...prev, decryptTime }));
        
        const decryptedMessage = { ...message, content };
        
        if (selectedUser && message.senderId === selectedUser._id) {
            // Đang chat với người gửi → Thêm vào khung chat
            setMessages(prev => {
                const exists = prev.some(m => m._id === message._id);
                if (exists) return prev;
                return [...prev, decryptedMessage];
            });
            
            setFilteredMessages(prev => {
                const exists = prev.some(m => m._id === message._id);
                if (exists) return prev;
                return [...prev, decryptedMessage];
            });
        } else {
            // KHÔNG đang chat → Tăng badge + thông báo
            setUnreadMessages(prev => ({
                ...prev,
                [message.senderId]: (prev[message.senderId] || 0) + 1
            }));
            
            // 🔊 PHÁT ÂM THANH
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACBhYqFbF1fdW2Ei4uKjI2NjIyMjIqKiomJiYmJiYqJiomJiYiIh4eGhYWEg4OCgYF/fn18e3p5eHd2dXRzcnFwb25tbGtqaWhnZmVkY2JhYF9eXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAA==');
                audio.play().catch(() => {});
            } catch (audioErr) {}
            
            // 🔔 BROWSER NOTIFICATION
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    const notification = new Notification('💬 Tin nhắn mới!', {
                        body: content.length > 50 ? content.substring(0, 50) + '...' : content,
                        icon: 'https://cdn-icons-png.flaticon.com/512/134/134914.png'
                    });
                    
                    notification.onclick = () => {
                        window.focus();
                        notification.close();
                    };
                    
                    setTimeout(() => notification.close(), 5000);
                } catch (notifErr) {}
            }
        }
        
    } catch (err) {}
});

            newSocket.on('user-status-change', (data) => {
                setUsers(prev => prev.map(u => 
                    u._id === data.userId ? { ...u, isOnline: data.isOnline } : u
                ));
            });

            newSocket.on('update-users-list', (newUser) => {
                setUsers(prev => {
                    const exists = prev.some(u => u._id === newUser._id);
                    if (exists) return prev;
                    return [...prev, newUser];
                });
                
                setFilteredUsers(prev => {
                    const exists = prev.some(u => u._id === newUser._id);
                    if (exists) return prev;
                    return [...prev, newUser];
                });
            });

            return () => newSocket.disconnect();
        }
    }, [isLoggedIn, currentUser, selectedUser]);

    useEffect(() => {
        if (isLoggedIn && token) {
            fetchUsers();
        }
    }, [isLoggedIn, token]);

    useEffect(() => {
        if (searchUser) {
            setFilteredUsers(users.filter(u => 
                (u.nickname || u.username).toLowerCase().includes(searchUser.toLowerCase())
            ));
        } else {
            setFilteredUsers(users);
        }
    }, [searchUser, users]);

    useEffect(() => {
        if (searchMessage) {
            setFilteredMessages(messages.filter(m => 
                m.content?.toLowerCase().includes(searchMessage.toLowerCase())
            ));
        } else {
            setFilteredMessages(messages);
        }
    }, [searchMessage, messages]);

    const fetchUsers = async () => {
        try {
            const currentToken = getToken();
            if (!currentToken) return;
            
            const res = await axios.get(`${API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${currentToken}` }
            });
            
            setUsers(res.data);
            setFilteredUsers(res.data);
        } catch (err) {}
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const keyPair = Crypto.generateKeyPair();
            
            window.localStorage.setItem('privateKey', JSON.stringify(keyPair.privateKey));
            
            const check = getPrivateKey();
            if (!check) {
                alert('Lỗi lưu private key!');
                return;
            }
            
            const res = await axios.post(`${API_URL}/api/auth/register`, {
                username,
                password,
                nickname: nickname || username,
                publicKey: keyPair.publicKey
            });
            
            if (rememberMe) {
                window.localStorage.setItem('token', res.data.token);
                window.localStorage.setItem('currentUser', JSON.stringify(res.data.user));
            } else {
                window.sessionStorage.setItem('token', res.data.token);
                window.sessionStorage.setItem('currentUser', JSON.stringify(res.data.user));
            }
            
            setToken(res.data.token);
            setCurrentUser(res.data.user);
            setIsLoggedIn(true);
            
        } catch (err) {
            setError(err.response?.data?.message || 'Lỗi đăng ký!');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, {
                username,
                password
            });
            
            const privateKey = getPrivateKey();
            
            if (!privateKey) {
                setError('Tài khoản này không có private key! Hãy đăng ký tài khoản mới!');
                setLoading(false);
                return;
            }
            
            if (rememberMe) {
                window.localStorage.setItem('token', res.data.token);
                window.localStorage.setItem('currentUser', JSON.stringify(res.data.user));
            } else {
                window.sessionStorage.setItem('token', res.data.token);
                window.sessionStorage.setItem('currentUser', JSON.stringify(res.data.user));
            }
            
            if (res.data.user.theme) {
                setTheme(res.data.user.theme);
            }
            
            setToken(res.data.token);
            setCurrentUser(res.data.user);
            setIsLoggedIn(true);
            
        } catch (err) {
            setError(err.response?.data?.message || 'Lỗi đăng nhập!');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        if (socket) socket.disconnect();
        
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('currentUser');
        window.sessionStorage.removeItem('token');
        window.sessionStorage.removeItem('currentUser');
        
        setIsLoggedIn(false);
        setCurrentUser(null);
        setToken('');
        setUsers([]);
        setMessages([]);
        setFilteredMessages([]);
        setSelectedUser(null);
        setSearchUser('');
        setSearchMessage('');
        setUnreadMessages({});
    };

    const handleSelectUser = async (user) => {
        setSelectedUser(user);
        setSearchMessage('');
        setUnreadMessages(prev => ({ ...prev, [user._id]: 0 }));
        
        try {
            const privateKey = getPrivateKey();
            
            if (!privateKey) {
                alert('Không có private key! Hãy đăng ký tài khoản mới!');
                return;
            }
            
            const currentToken = getToken();
            
            if (!currentToken) return;
            
            const res = await axios.get(`${API_URL}/api/messages/${user._id}`, {
                headers: { Authorization: `Bearer ${currentToken}` }
            });
            
            const decryptedMessages = res.data.map(msg => {
                if (msg.senderId === currentUser.id) {
                    return { ...msg, content: msg.senderContent || '📤 Tin nhắn của bạn' };
                }
                
                try {
                    const content = Crypto.decryptMessage(
                        msg.encryptedMessage,
                        msg.encryptedAESKey,
                        privateKey
                    );
                    return { ...msg, content };
                } catch (err) {
                    return { ...msg, content: '🔒 Không thể giải mã' };
                }
            });
            
            setMessages(decryptedMessages);
            setFilteredMessages(decryptedMessages);
            
        } catch (err) {}
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        
        if (!newMessage.trim() || !selectedUser) return;
        
        try {
            const startEncrypt = performance.now();
            
            const { aesKey, encryptedMessage } = Crypto.encryptMessage(newMessage);
            const encryptedAESKey = Crypto.encryptAESKey(aesKey, selectedUser.publicKey);
            
            const endEncrypt = performance.now();
            const encryptTime = (endEncrypt - startEncrypt).toFixed(2);
            
            const originalSize = new TextEncoder().encode(newMessage).length;
            const encryptedSize = JSON.stringify({
                iv: encryptedMessage.iv,
                encryptedData: encryptedMessage.encryptedData,
                a: encryptedAESKey.a,
                b: encryptedAESKey.b
            }).length;
            const ratio = (encryptedSize / originalSize).toFixed(2);
            
            setCryptoStats({
                encryptTime,
                decryptTime: 0,
                originalSize,
                encryptedSize,
                ratio,
                securityLevel: 'Cao (AES-256 + ElGamal 512-bit)'
            });
            
            if (socket) {
                socket.emit('send-message', {
                    receiverId: selectedUser._id,
                    encryptedMessage,
                    encryptedAESKey,
                    senderContent: newMessage
                });
            }
            
            const tempMessage = {
                _id: Date.now().toString(),
                senderId: currentUser.id,
                receiverId: selectedUser._id,
                content: newMessage,
                senderContent: newMessage,
                createdAt: new Date().toISOString()
            };
            
            setMessages(prev => [...prev, tempMessage]);
            setFilteredMessages(prev => [...prev, tempMessage]);
            setNewMessage('');
            
        } catch (err) {
            alert('Lỗi gửi tin nhắn!');
        }
    };

    const toggleTheme = () => {
        const newMode = theme.mode === 'light' ? 'dark' : 'light';
        setTheme(prev => ({ ...prev, mode: newMode }));
    };

    const changeChatColor = (color) => {
        setTheme(prev => ({ ...prev, chatColor: color }));
        setShowThemeMenu(false);
    };

    if (!isLoggedIn) {
        return (
            <div className={`auth-container ${theme.mode}`}>
                <div 
                    className="auth-left" 
                    style={{ backgroundColor: theme.chatColor }}
                    onMouseMove={handleMouseMove}
                >
                    <div className="flower-container">
                        {flowers.map((flower, index) => (
                            <span
                                key={index}
                                className="flower"
                                style={{
                                    left: flower.left,
                                    animationDuration: flower.duration,
                                    animationDelay: flower.delay,
                                    fontSize: flower.size
                                }}
                            >
                                {flower.emoji}
                            </span>
                        ))}
                    </div>
                    
                    <div className="auth-left-content">
                        <h2>💬 Chat App</h2>
                        <p>🔐 Mã hóa ElGamal + AES</p>
                        <p>An toàn - Bảo mật - Hiện đại</p>
                    </div>
                </div>
                
                <div className="auth-right">
                    <div className="auth-controls">
                        <button onClick={() => setShowColorPicker(!showColorPicker)}>🎨</button>
                        <button onClick={toggleTheme}>{theme.mode === 'light' ? '🌙' : '☀️'}</button>
                    </div>
                    
                    {showColorPicker && (
                        <div className="color-picker">
                            <p>Chọn màu:</p>
                            <div className="color-picker-options">
                                {CHAT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        className={`color-picker-option ${theme.chatColor === color ? 'active' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => changeChatColor(color)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="auth-box">
                        <h1>Đăng {isRegister ? 'ký' : 'nhập'}</h1>
                        <p>{isRegister ? 'Tạo tài khoản mới' : 'Chào mừng trở lại!'}</p>
                        
                        <form onSubmit={isRegister ? handleRegister : handleLogin}>
                            <input
                                type="text"
                                placeholder="Username (đăng nhập)"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                            
                            {isRegister && (
                                <input
                                    type="text"
                                    placeholder="Tên hiển thị (Nickname)"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                />
                            )}
                            
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            
                            <label className="remember-me">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span>Ghi nhớ đăng nhập</span>
                            </label>
                            
                            {error && <div className="error">{error}</div>}
                            
                            <button type="submit" disabled={loading}>
                                {loading ? 'Đang xử lý...' : isRegister ? 'Đăng ký' : 'Đăng nhập'}
                            </button>
                        </form>
                        
                        <p className="toggle-auth">
                            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
                            <button onClick={() => setIsRegister(!isRegister)}>
                                {isRegister ? 'Đăng nhập' : 'Đăng ký'}
                            </button>
                        </p>
                    </div>
                </div>
                
                {mouseFlowers.map((flower, index) => (
                    <span
                        key={index}
                        className="mouse-flower"
                        style={{
                            left: flower.x,
                            top: flower.y,
                            fontSize: flower.size
                        }}
                    >
                        {flower.emoji}
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className={`chat-container ${theme.mode}`}>
            <div className="sidebar">
                <div className="sidebar-header">
                    <h3>💬 Chat App</h3>
                    
                    <div className="user-info">
                        <div className="current-user">
    <div className="avatar-wrapper">
        <div className="avatar" style={{ backgroundColor: currentUser?.avatar || '#4A90D9' }}>
            {(currentUser?.nickname || currentUser?.username)?.[0]?.toUpperCase()}
        </div>
        <span className="online-dot"></span>
    </div>
    <span>{currentUser?.nickname || currentUser?.username}</span>
</div>
                        
                        <div className="header-buttons">
                            <button onClick={toggleTheme} className="theme-btn">🌙</button>
                            <button onClick={() => setShowThemeMenu(!showThemeMenu)} className="theme-btn">🎨</button>
                            <button onClick={() => setShowStats(!showStats)} className="theme-btn">📊</button>
                            <button onClick={handleLogout} className="logout-btn">Đăng xuất</button>
                        </div>
                    </div>
                    
                    {showThemeMenu && (
                        <div className="color-menu">
                            <p>🎨 Chọn màu chat:</p>
                            <div className="color-options">
                                {CHAT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        className={`color-option ${theme.chatColor === color ? 'active' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => changeChatColor(color)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {showStats && (
                        <div className="crypto-stats">
                            <h4>📊 Đánh giá mã hóa</h4>
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <span>Thời gian mã hóa:</span>
                                    <strong>{cryptoStats.encryptTime}ms</strong>
                                </div>
                                <div className="stat-item">
                                    <span>Thời gian giải mã:</span>
                                    <strong>{cryptoStats.decryptTime}ms</strong>
                                </div>
                                <div className="stat-item">
                                    <span>Kích thước gốc:</span>
                                    <strong>{cryptoStats.originalSize} bytes</strong>
                                </div>
                                <div className="stat-item">
                                    <span>Kích thước mã hóa:</span>
                                    <strong>{cryptoStats.encryptedSize} bytes</strong>
                                </div>
                                <div className="stat-item">
                                    <span>Tỷ lệ tăng:</span>
                                    <strong>{cryptoStats.ratio}x</strong>
                                </div>
                                <div className="stat-item">
                                    <span>Mức độ an toàn:</span>
                                    <strong style={{ color: '#4CAF50', fontSize: '11px' }}>{cryptoStats.securityLevel}</strong>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <input
                        type="text"
                        className="search-input"
                        placeholder="🔍 Tìm user..."
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                    />
                </div>
                
                <div className="users-list">
                    {filteredUsers.map(user => (
                        <div
                            key={user._id}
                            className={`user-item ${selectedUser?._id === user._id ? 'active' : ''}`}
                            onClick={() => handleSelectUser(user)}
                        >
                            <div className="avatar-wrapper">
    <div className="avatar" style={{ backgroundColor: currentUser?.avatar || '#4A90D9' }}>
        {(currentUser?.nickname || currentUser?.username)?.[0]?.toUpperCase()}
    </div>
    <span className="online-dot"></span>
</div>
                            <div className="user-details">
                                <span>{user.nickname || user.username}</span>
                                <small style={{ color: user.isOnline ? '#4CAF50' : '#999' }}>
                                    {user.isOnline ? 'Online' : 'Offline'}
                                </small>
                            </div>
                            
                            {unreadMessages[user._id] > 0 && (
                                <div className="badge">{unreadMessages[user._id]}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="chat-main">
                {selectedUser ? (
                    <>
                        <div className="chat-header">
                            <div className="avatar-wrapper">
    <div className="avatar" style={{ backgroundColor: selectedUser.avatar || '#4A90D9' }}>
        {(selectedUser.nickname || selectedUser.username)[0].toUpperCase()}
    </div>
    {selectedUser.isOnline && <span className="online-dot"></span>}
</div>
                            <div>
                                <h3>{selectedUser.nickname || selectedUser.username}</h3>
                                <small style={{ color: selectedUser.isOnline ? '#4CAF50' : '#999' }}>
                                    {selectedUser.isOnline ? 'Online' : 'Offline'}
                                </small>
                            </div>
                            
                            <input
                                type="text"
                                className="search-message"
                                placeholder="🔍 Tìm tin nhắn..."
                                value={searchMessage}
                                onChange={(e) => setSearchMessage(e.target.value)}
                            />
                        </div>
                        
                        <div className="messages-area">
                            {filteredMessages.length > 0 ? (
                                filteredMessages.map((msg, index) => (
                                    <div
                                        key={msg._id || index}
                                        className={`message ${msg.senderId === currentUser.id ? 'sent' : 'received'}`}
                                    >
                                        <div 
                                            className="message-content"
                                            style={msg.senderId === currentUser.id ? { backgroundColor: theme.chatColor } : {}}
                                        >
                                            {msg.content}
                                        </div>
                                        <small>
                                            {new Date(msg.createdAt).toLocaleTimeString()}
                                        </small>
                                    </div>
                                ))
                            ) : (
                                <p style={{ textAlign: 'center', color: '#999' }}>Chưa có tin nhắn</p>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        <form className="message-input" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                placeholder="Nhập tin nhắn..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button type="submit" style={{ backgroundColor: theme.chatColor }}>
                                Gửi
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="no-chat">
                        <h2>Chọn user để bắt đầu chat</h2>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;