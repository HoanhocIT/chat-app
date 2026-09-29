import { useState, useEffect } from 'react';
import { Server, Check, X, RefreshCw, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { getApiUrl, setApiUrl } from '../api/http';
import axios from 'axios';

export default function BackendConfigModal({ isOpen, onClose }) {
  const [url, setUrl] = useState(getApiUrl());
  const [status, setStatus] = useState('idle'); // idle | checking | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl(getApiUrl());
      checkConnection(getApiUrl());
    }
  }, [isOpen]);

  async function checkConnection(targetUrl) {
    const clean = (targetUrl || url).trim().replace(/\/+$/, '');
    setStatus('checking');
    setMessage('Đang kiểm tra kết nối tới ' + clean + '/api/health ...');

    try {
      const res = await axios.get(`${clean}/api/health`, { timeout: 4000 });
      if (res.data?.ok) {
        setStatus('success');
        setMessage(`Kết nối thành công! Máy chủ đang hoạt động.`);
      } else {
        setStatus('error');
        setMessage(`Máy chủ phản hồi nhưng không đúng định dạng.`);
      }
    } catch (err) {
      setStatus('error');
      setMessage(
        `Không thể kết nối tới ${clean}. Hãy đảm bảo bạn đã mở terminal và chạy: cd backend && npm run dev`
      );
    }
  }

  function handleSave() {
    const clean = url.trim().replace(/\/+$/, '');
    setApiUrl(clean);
    onClose();
    window.location.reload();
  }

  function handlePreset(presetUrl) {
    setUrl(presetUrl);
    checkConnection(presetUrl);
  }

  if (!isOpen) return null;

  return (
    <div className="crypto-modal-backdrop" onClick={onClose}>
      <div className="crypto-modal-window" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="crypto-modal-header">
          <div className="crypto-modal-title">
            <div className="crypto-modal-icon-badge">
              <Server size={18} />
            </div>
            <div>
              <h3>Cấu hình kết nối Backend</h3>
              <p>Khắc phục lỗi khác cổng localhost giữa Frontend và Backend</p>
            </div>
          </div>
          <button className="crypto-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="crypto-modal-body">
          <div className="mb-2">
            <label className="text-xs text-dim block mb-1 font-semibold">Địa chỉ Backend API (URL):</label>
            <div className="flex gap-2">
              <input
                className="hash-test-input font-mono"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="vd: http://localhost:5000"
              />
              <button
                className="crypto-copy-btn"
                style={{ padding: '0 14px', whiteSpace: 'nowrap' }}
                onClick={() => checkConnection(url)}
                disabled={status === 'checking'}
              >
                <RefreshCw size={13} className={status === 'checking' ? 'spinning-icon' : ''} />
                <span>Kiểm tra</span>
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-xs text-dim block mb-1">Cổng thông dụng:</span>
            <div className="flex gap-2 flex-wrap">
              {[
                'http://localhost:5000',
                'http://127.0.0.1:5000',
                'http://localhost:5001',
                'http://localhost:3000',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="quick-preset-btn"
                  onClick={() => handlePreset(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Status Alert Box */}
          {status !== 'idle' && (
            <div
              className={`auth-alert-message ${
                status === 'success' ? 'info' : status === 'error' ? 'error' : 'info'
              }`}
              style={{ marginTop: 10, marginBottom: 4 }}
            >
              {status === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald flex-shrink-0" />
              ) : status === 'error' ? (
                <AlertCircle size={18} className="text-red flex-shrink-0" />
              ) : (
                <RefreshCw size={18} className="spinning-icon flex-shrink-0" />
              )}
              <span style={{ fontSize: 12.5, lineHeight: 1.4 }}>{message}</span>
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="crypto-copy-btn" onClick={onClose}>
              Hủy
            </button>
            <button className="btn-auth-primary" style={{ padding: '8px 18px', fontSize: 13 }} onClick={handleSave}>
              Lưu & Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
