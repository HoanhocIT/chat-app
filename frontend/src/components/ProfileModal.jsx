import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAvatarGradient, getInitials } from '../utils/avatar';
import {
  User,
  Shield,
  Key,
  Calendar,
  Mail,
  Copy,
  Check,
  X,
  Users,
  Cpu
} from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, friendsCount = 0 }) {
  const { user, privateKey } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen || !user) return null;

  function copyPublicKey() {
    if (!user?.elgamalPublicKey) return;
    navigator.clipboard.writeText(JSON.stringify(user.elgamalPublicKey, null, 2));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Gần đây';

  return (
    <div className="crypto-modal-backdrop" onClick={onClose}>
      <div className="crypto-modal-window profile-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="crypto-modal-header">
          <div className="crypto-modal-title">
            <div className="crypto-modal-icon-badge text-cyan">
              <User size={18} />
            </div>
            <div>
              <h3>Hồ sơ cá nhân</h3>
              <span className="crypto-modal-subtitle">Thông tin tài khoản & Khóa định danh E2EE</span>
            </div>
          </div>
          <button className="crypto-modal-close-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="crypto-modal-body profile-modal-body">
          {/* Avatar Banner */}
          <div className="profile-banner-card">
            <div
              className="user-avatar-circle profile-large-avatar"
              style={{ background: getAvatarGradient(user.username) }}
            >
              {getInitials(user.username)}
              <span className="status-indicator-dot online large" />
            </div>
            <div className="profile-banner-names">
              <h2 className="profile-username">{user.username}</h2>
              <span className="profile-email-badge">
                <Mail size={13} /> {user.email}
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="profile-stats-grid">
            <div className="profile-stat-box">
              <Users size={18} className="text-cyan" />
              <div className="stat-data">
                <span className="stat-number">{friendsCount}</span>
                <span className="stat-label">Bạn bè</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <Shield size={18} className="text-emerald" />
              <div className="stat-data">
                <span className="stat-number">E2EE</span>
                <span className="stat-label">Bảo mật đầu cuối</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <Cpu size={18} className="text-purple" />
              <div className="stat-data">
                <span className="stat-number">256-bit</span>
                <span className="stat-label">Độ dài khóa ElGamal</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <Calendar size={18} className="text-amber" />
              <div className="stat-data">
                <span className="stat-number">{joinedDate}</span>
                <span className="stat-label">Ngày tham gia</span>
              </div>
            </div>
          </div>

          {/* Public Key Display */}
          <div className="profile-key-section">
            <div className="profile-key-head">
              <div className="flex-center gap-2">
                <Key size={15} className="text-cyan" />
                <span className="font-semibold text-sm">Khóa công khai ElGamal (Public Key)</span>
              </div>
              <button className="btn-copy-small" type="button" onClick={copyPublicKey}>
                {copiedKey ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                <span>{copiedKey ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
            <p className="profile-key-desc">
              Khóa công khai dùng để người khác mã hóa tin nhắn gửi đến bạn. Khóa này an toàn để chia sẻ công khai.
            </p>
            <div className="profile-key-preview">
              <code>
                {user.elgamalPublicKey
                  ? `p: ${user.elgamalPublicKey.p?.slice(0, 32)}...\ng: ${user.elgamalPublicKey.g?.slice(0, 32)}...\ny: ${user.elgamalPublicKey.y?.slice(0, 32)}...`
                  : 'Đang tải thông số khóa...'}
              </code>
            </div>
          </div>

          {/* Device Security Status */}
          <div className={`profile-device-status ${privateKey ? 'secure' : 'warning'}`}>
            <Shield size={16} />
            <span>
              {privateKey
                ? 'Thiết bị này có Private Key trong trình duyệt — Sẵn sàng giải mã tin nhắn.'
                : 'Thiết bị này chưa có Private Key — Hãy nhập khóa sao lưu để đọc tin nhắn cũ.'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="crypto-modal-footer">
          <button className="btn-modal-primary" onClick={onClose} type="button">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
