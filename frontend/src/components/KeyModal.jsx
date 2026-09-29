import { useState } from 'react';
import {
  Shield,
  Key,
  Copy,
  Check,
  X,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  Download,
  Upload,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { truncateHex } from '../utils/avatar';
import { useAuth } from '../context/AuthContext';

export default function KeyModal({ isOpen, onClose, user, conversation, privateKey }) {
  const { importPrivateKey } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPrivKey, setCopiedPrivKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showImportBox, setShowImportBox] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  if (!isOpen) return null;

  function copyPublicKey() {
    if (!user?.elgamalPublicKey) return;
    navigator.clipboard.writeText(JSON.stringify(user.elgamalPublicKey, null, 2));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function copyPrivateKey() {
    if (!privateKey) return;
    navigator.clipboard.writeText(JSON.stringify(privateKey, null, 2));
    setCopiedPrivKey(true);
    setTimeout(() => setCopiedPrivKey(false), 2000);
  }

  function downloadKeyBackup() {
    if (!privateKey) return;
    const backupData = {
      user: user?.username,
      publicKey: user?.elgamalPublicKey,
      privateKey: privateKey,
      exportedAt: new Date().toISOString(),
      note: 'KHÓA BÍ MẬT ELGAMAL - KHÔNG CHIA SẺ VỚI NGƯỜI KHÁC',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elgamal-key-${user?.username || 'user'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportSubmit(e) {
    e.preventDefault();
    setImportError('');
    setImportSuccess(false);

    try {
      const parsed = JSON.parse(importInput.trim());
      // Cho phép import cả dạng { privateKey: { x, p } } hoặc trực tiếp { x, p }
      const keyToImport = parsed.privateKey || parsed;

      if (!keyToImport || !keyToImport.x) {
        throw new Error('Dữ liệu không hợp lệ. Khóa riêng tư phải chứa trường "x"');
      }

      const ok = importPrivateKey(keyToImport);
      if (ok) {
        setImportSuccess(true);
        setShowImportBox(false);
        setImportInput('');
        setTimeout(() => setImportSuccess(false), 3000);
      }
    } catch (err) {
      setImportError('Lỗi định dạng: ' + err.message);
    }
  }

  const otherParticipants = conversation?.participants?.filter((p) => p._id !== user?._id) || [];

  return (
    <div className="crypto-modal-backdrop" onClick={onClose}>
      <div className="crypto-modal-window key-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="crypto-modal-header">
          <div className="crypto-modal-title">
            <div className="crypto-modal-icon-badge text-cyan">
              <Shield size={18} />
            </div>
            <div>
              <h3>Quản lý khóa & Tham số ElGamal</h3>
              <p>Mã hóa đầu cuối không phụ thuộc máy chủ trung gian (Zero-Knowledge)</p>
            </div>
          </div>
          <button className="crypto-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="crypto-modal-body">
          {importSuccess && (
            <div className="crypto-alert-banner success">
              <CheckCircle2 size={16} />
              <span>Đã nhập và khôi phục khóa bí mật thành công! Các tin nhắn cũ sẽ được giải mã.</span>
            </div>
          )}

          {/* User's own public key */}
          <div className="crypto-card">
            <div className="crypto-card-head">
              <div className="flex-center gap-2">
                <Key size={15} className="text-cyan" />
                <strong>Khóa công khai (Public Key của {user?.username})</strong>
              </div>
              <button className="crypto-copy-btn mini" onClick={copyPublicKey}>
                {copiedKey ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
                <span>{copiedKey ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <p className="crypto-hint mb-2">
              Khóa này được lưu công khai trên máy chủ để người khác mã hóa tin nhắn gửi cho bạn:
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

          {/* Private Key Status & Management */}
          <div className="crypto-card key-private-card">
            <div className="crypto-card-head">
              <div className="flex-center gap-2">
                <Lock size={15} className={privateKey ? 'text-emerald' : 'text-amber'} />
                <strong>Khóa bí mật (Private Key x)</strong>
              </div>
              <span className={`crypto-status-pill ${privateKey ? 'status-valid' : 'status-invalid'}`}>
                {privateKey ? '✓ Đang sẵn sàng' : '⚠ Chưa tìm thấy khóa'}
              </span>
            </div>

            <p className="crypto-hint mb-2">
              {privateKey ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald inline-icon" /> Khóa bí mật <code>x</code> được lưu cục bộ trên thiết bị của bạn. 
                  Máy chủ không bao giờ biết khóa này (Zero-Knowledge Architecture).
                </>
              ) : (
                'Khóa bí mật chưa có trên trình duyệt này (do đăng nhập từ máy mới hoặc xóa cookie). Hãy nhập khóa đã sao lưu để giải mã tin nhắn.'
              )}
            </p>

            {privateKey && (
              <div className="key-action-bar">
                <button
                  className="crypto-btn-sm"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPrivateKey ? 'Ẩn khóa bí mật' : 'Xem số x'}</span>
                </button>
                <button className="crypto-btn-sm" onClick={copyPrivateKey}>
                  {copiedPrivKey ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                  <span>{copiedPrivKey ? 'Đã sao chép x' : 'Copy khóa x'}</span>
                </button>
                <button className="crypto-btn-sm highlight" onClick={downloadKeyBackup} title="Tải file sao lưu khóa để chuyển sang máy khác">
                  <Download size={13} />
                  <span>Sao lưu ra file (.json)</span>
                </button>
              </div>
            )}

            {showPrivateKey && privateKey && (
              <div className="private-key-display-box mt-2">
                <div className="text-xs text-amber font-semibold mb-1">
                  ⚠️ CẢNH BÁO: Không chia sẻ chuỗi bí mật x này cho bất kỳ ai!
                </div>
                <code className="text-break block text-xs font-mono p-2 bg-dark rounded">
                  {typeof privateKey.x === 'string' ? privateKey.x : JSON.stringify(privateKey.x)}
                </code>
              </div>
            )}

            {/* Khôi phục / Nhập khóa từ thiết bị khác */}
            <div className="mt-3 pt-2 border-t border-subtle">
              <button
                className="crypto-link-btn"
                onClick={() => setShowImportBox(!showImportBox)}
              >
                <Upload size={13} />
                <span>{showImportBox ? 'Đóng ô nhập khóa' : 'Khôi phục / Nhập khóa từ thiết bị khác (Import Key)'}</span>
              </button>

              {showImportBox && (
                <form onSubmit={handleImportSubmit} className="import-key-form mt-2">
                  <textarea
                    className="import-textarea"
                    rows={3}
                    placeholder='Dán chuỗi JSON khóa riêng tư (ví dụ: {"x": "..."} hoặc nội dung file backup)'
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                  />
                  {importError && (
                    <div className="text-xs text-rose-400 mt-1 flex-center gap-1">
                      <AlertTriangle size={13} /> {importError}
                    </div>
                  )}
                  <div className="flex-end gap-2 mt-2">
                    <button
                      type="button"
                      className="crypto-btn-sm"
                      onClick={() => setShowImportBox(false)}
                    >
                      Hủy
                    </button>
                    <button type="submit" className="crypto-btn-sm primary">
                      Xác nhận nạp khóa
                    </button>
                  </div>
                </form>
              )}
            </div>
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
