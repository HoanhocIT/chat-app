import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../api/socket';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import KeyModal from '../components/KeyModal';
import ThemeModal from '../components/ThemeModal';
import { Shield, Key, LogOut, AlertTriangle, ShieldCheck, Cpu, Palette } from 'lucide-react';
import { getAvatarGradient, getInitials } from '../utils/avatar';

export default function Chat() {
  const { user, privateKey, logout } = useAuth();
  const [activeId, setActiveId] = useState(null);
  const [userStatuses, setUserStatuses] = useState({});
  const [showMyKeyModal, setShowMyKeyModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const handleStatusChange = ({ userId, status }) => {
      setUserStatuses((prev) => ({ ...prev, [userId]: status }));
    };

    socket?.on('user_status_changed', handleStatusChange);
    return () => {
      socket?.off('user_status_changed', handleStatusChange);
    };
  }, []);

  return (
    <div className={`app-chat-shell ${activeId ? 'has-active' : ''}`}>
      {/* Sidebar (Rail) */}
      <aside className="chat-sidebar-rail">
        {/* App Logo & Branding */}
        <div className="sidebar-brand-header">
          <div className="brand-logo-area">
            <div className="brand-shield-glow">
              <Shield size={20} />
            </div>
            <div className="brand-text-block">
              <div className="brand-app-name">Chat<span className="text-cyan">-app</span></div>
              <span className="brand-tagline">ElGamal + AES-256</span>
            </div>
          </div>
        </div>

        {/* Warning banner if no private key */}
        {!privateKey && (
          <div className="sidebar-security-alert">
            <AlertTriangle size={18} className="alert-icon-svg" />
            <div className="alert-content">
              <strong>Thiếu khóa riêng tư</strong>
              <p>Thiết bị này không có private key. Bạn chỉ có thể đọc tin nhắn mới gửi từ phiên này.</p>
            </div>
          </div>
        )}

        {/* Conversations List */}
        <ConversationList
          activeId={activeId}
          onSelect={(id) => setActiveId(id)}
          userStatuses={userStatuses}
        />

        {/* Bottom Current User Card */}
        <div className="sidebar-user-footer">
          <div className="user-profile-summary">
            <div
              className="user-avatar-circle"
              style={{ background: getAvatarGradient(user?.username) }}
            >
              {getInitials(user?.username)}
              <span className="status-indicator-dot online" />
            </div>
            <div className="user-text-info">
              <span className="current-username">{user?.username}</span>
              <span className="current-user-role">
                <Cpu size={12} className="text-cyan mr-1" />
                Khóa 256-bit
              </span>
            </div>
          </div>

          <div className="footer-action-buttons">
            <button
              className="btn-footer-icon"
              onClick={() => setShowThemeModal(true)}
              title="Đổi màu giao diện Chat-app"
            >
              <Palette size={16} />
            </button>
            <button
              className="btn-footer-icon"
              onClick={() => setShowMyKeyModal(true)}
              title="Xem thông số khóa bảo mật của bạn"
            >
              <Key size={16} />
            </button>
            <button
              className="btn-footer-icon btn-logout"
              onClick={logout}
              title="Đăng xuất tài khoản"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Window */}
      <main className="chat-main-container">
        <ChatWindow
          conversationId={activeId}
          userStatuses={userStatuses}
          onBack={() => setActiveId(null)}
          onOpenThemeModal={() => setShowThemeModal(true)}
        />
      </main>

      {/* My Key Modal */}
      <KeyModal
        isOpen={showMyKeyModal}
        onClose={() => setShowMyKeyModal(false)}
        user={user}
        conversation={null}
        privateKey={privateKey}
      />

      {/* Theme Color Modal */}
      <ThemeModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
      />
    </div>
  );
}
