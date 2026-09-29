import { useState } from 'react';
import { Shield, Key, Copy, Check, X, Lock, CheckCircle2 } from 'lucide-react';
import { truncateHex } from '../utils/avatar';

export default function KeyModal({ isOpen, onClose, user, conversation, privateKey }) {
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  function copyPublicKey() {
    if (!user?.elgamalPublicKey) return;
    navigator.clipboard.writeText(JSON.stringify(user.elgamalPublicKey, null, 2));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  const otherParticipants = conversation?.participants?.filter(p => p._id !== user?._id) || [];

  return (
    <div className="crypto-modal-backdrop" onClick={onClose}>
      <div className="crypto-modal-window key-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="crypto-modal-header">
          <div className="crypto-modal-title">
            <div className="crypto-modal-icon-badge text-cyan">
              <Shield size={18} />
            </div>
            <div>
              <h3>Thông số bảo mật & Khóa ElGamal</h3>
              <p>Mã hóa đầu cuối không phụ thuộc máy chủ trung gian</p>
            </div>
          </div>
          <button className="crypto-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="crypto-modal-body">
          {/* User's own key status */}
          <div className="crypto-card">
            <div className="crypto-card-head">
              <div className="flex-center gap-2">
                <Key size={15} className="text-cyan" />
                <strong>Khóa công khai của bạn ({user?.username})</strong>
              </div>
              <button className="crypto-copy-btn mini" onClick={copyPublicKey}>
                {copiedKey ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
                <span>{copiedKey ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <p className="crypto-hint mb-2">
              Khóa này được công khai trên máy chủ để người khác mã hóa tin nhắn gửi cho bạn:
            </p>
            <div className="crypto-param-grid">
              <div className="crypto-param-item">
                <label>Số nguyên tố lớn (p):</label>
                <code>{truncateHex(user?.elgamalPublicKey?.p, 16, 12)}</code>
              </div>
              <div className="crypto-param-item">
                <label>Phần tử sinh (g):</label>
                <code>{user?.elgamalPublicKey?.g || '—'}</code>
              </div>
              <div className="crypto-param-item">
                <label>Khóa công khai (y = g^x mod p):</label>
                <code>{truncateHex(user?.elgamalPublicKey?.y, 16, 12)}</code>
              </div>
            </div>
          </div>

          {/* Private Key Status */}
          <div className="crypto-card key-private-card">
            <div className="crypto-card-head">
              <div className="flex-center gap-2">
                <Lock size={15} className={privateKey ? 'text-emerald' : 'text-amber'} />
                <strong>Trạng thái Khóa bí mật (Private Key x)</strong>
              </div>
              <span className={`crypto-status-pill ${privateKey ? 'status-valid' : 'status-invalid'}`}>
                {privateKey ? '✓ Đang sẵn sàng' : '⚠ Chưa tìm thấy khóa'}
              </span>
            </div>
            <p className="crypto-hint">
              {privateKey ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald inline-icon" /> Khóa bí mật <code>x</code> được lưu cục bộ trên thiết bị của bạn. 
                  Máy chủ không bao giờ biết khóa này (Zero-Knowledge Architecture).
                </>
              ) : (
                'Khóa bí mật không tồn tại trên trình duyệt này. Bạn cần sử dụng thiết bị ban đầu đã đăng ký để giải mã tin nhắn cũ.'
              )}
            </p>
          </div>

          {/* Other participants' keys */}
          {otherParticipants.length > 0 && (
            <div className="crypto-card">
              <div className="crypto-card-head">
                <strong>Khóa công khai đối tác ({otherParticipants[0]?.username})</strong>
                <span className="crypto-tag tag-slate">Đã xác minh</span>
              </div>
              <div className="crypto-param-grid mt-2">
                <div className="crypto-param-item">
                  <label>Khóa công khai y của {otherParticipants[0]?.username}:</label>
                  <code>{truncateHex(otherParticipants[0]?.elgamalPublicKey?.y, 20, 14)}</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
