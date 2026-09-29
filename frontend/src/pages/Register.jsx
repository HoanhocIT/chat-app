import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandPanel from '../components/BrandPanel';
import BackendConfigModal from '../components/BackendConfigModal';
import { getApiUrl } from '../api/http';
import http from '../api/http';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, KeyRound, AlertCircle, Cpu, Server } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | generating-keys | error
  const [error, setError] = useState('');
  const [showBackendConfig, setShowBackendConfig] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    http
      .get('/health', { timeout: 3000 })
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      setStatus('generating-keys');
      await register(form);
      navigate('/chat');
    } catch (err) {
      setStatus('error');
      if (!err.response) {
        setError(
          `Không thể kết nối tới Backend tại ${getApiUrl()}. Hãy kiểm tra xem bạn đã chạy: cd backend && npm run dev chưa.`
        );
        setBackendStatus('offline');
      } else {
        setError(err.response?.data?.error || 'Đăng ký thất bại. Tên đăng nhập hoặc email có thể đã tồn tại.');
      }
    }
  }

  return (
    <div className="auth-split-screen">
      <BrandPanel />

      <div className="auth-form-container">
        <div className="auth-form-card">
          <div className="auth-card-top">
            <div className="auth-card-badge">
              <KeyRound size={16} />
              <span>Khởi tạo bảo mật E2E</span>
            </div>
            <h1 className="auth-heading">Đăng ký tài khoản</h1>
            <p className="auth-subheading">
              Cặp khóa ElGamal của bạn sẽ được tạo ngẫu nhiên ngay trên trình duyệt này.
            </p>
          </div>

          {backendStatus === 'offline' && !error && (
            <div className="auth-alert-message error" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div className="flex gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-1" />
                <span>Chưa phát hiện thấy Backend tại {getApiUrl()}.</span>
              </div>
              <button
                type="button"
                className="text-cyan text-xs underline mt-2"
                onClick={() => setShowBackendConfig(true)}
              >
                ⚙️ Kiểm tra / Đổi cổng Backend
              </button>
            </div>
          )}

          {error && (
            <div className="auth-alert-message error" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div className="flex gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-1" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                className="text-cyan text-xs underline mt-2"
                onClick={() => setShowBackendConfig(true)}
              >
                ⚙️ Kiểm tra / Đổi địa chỉ Backend (Port)
              </button>
            </div>
          )}

          {status === 'generating-keys' && (
            <div className="auth-alert-message info">
              <Cpu size={16} className="spinning-icon" />
              <span>Đang tính toán số học nguyên tố & sinh cặp khóa ElGamal 256-bit...</span>
            </div>
          )}

          <form className="auth-form-body" onSubmit={handleSubmit}>
            <div className="input-field-group">
              <label htmlFor="username">Tên đăng nhập</label>
              <div className="input-with-icon">
                <User size={18} className="field-icon-left" />
                <input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="vd: hoan_nguyen"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="input-field-group">
              <label htmlFor="email">Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="field-icon-left" />
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ban@example.com"
                  required
                />
              </div>
            </div>

            <div className="input-field-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="input-with-icon">
                <Lock size={18} className="field-icon-left" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Tối thiểu 8 ký tự..."
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="field-toggle-pwd"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              className="btn-auth-primary"
              type="submit"
              disabled={status === 'generating-keys'}
            >
              {status === 'generating-keys' ? (
                <span className="flex-center gap-2">
                  <span className="spinner-dots" />
                  Đang sinh khóa an toàn...
                </span>
              ) : (
                <span className="flex-center gap-2">
                  Tạo tài khoản & Sinh khóa
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <div className="auth-card-footer">
            <p className="auth-switch-link">
              Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
            </p>
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                className="crypto-copy-btn mini"
                style={{ margin: '0 auto' }}
                onClick={() => setShowBackendConfig(true)}
                title="Bấm để kiểm tra và cấu hình cổng Backend"
              >
                <Server size={12} className="text-cyan mr-1" />
                <span>Backend: {getApiUrl()}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <BackendConfigModal
        isOpen={showBackendConfig}
        onClose={() => setShowBackendConfig(false)}
      />
    </div>
  );
}
