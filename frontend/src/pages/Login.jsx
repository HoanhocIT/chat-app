import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandPanel from '../components/BrandPanel';
import BackendConfigModal from '../components/BackendConfigModal';
import { getApiUrl } from '../api/http';
import http from '../api/http';
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Server } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBackendConfig, setShowBackendConfig] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // checking | online | offline

  useEffect(() => {
    http
      .get('/health', { timeout: 3000 })
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/chat');
    } catch (err) {
      if (!err.response) {
        setError(
          `Không thể kết nối tới Backend tại ${getApiUrl()}. Hãy đảm bảo bạn đã chạy terminal: cd backend && npm run dev`
        );
        setBackendStatus('offline');
      } else {
        setError(err.response?.data?.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split-screen">
      <BrandPanel />

      <div className="auth-form-container">
        <div className="auth-form-card">
          <div className="auth-card-top">
            <div className="auth-card-badge">
              <ShieldCheck size={16} />
              <span>Cổng truy cập an toàn</span>
            </div>
            <h1 className="auth-heading">Đăng nhập tài khoản</h1>
            <p className="auth-subheading">Truy cập hộp thư mã hóa đầu cuối của bạn.</p>
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

          <form className="auth-form-body" onSubmit={handleSubmit}>
            <div className="input-field-group">
              <label htmlFor="username">Tên đăng nhập</label>
              <div className="input-with-icon">
                <User size={18} className="field-icon-left" />
                <input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Nhập username của bạn..."
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="input-field-group">
              <div className="flex-between mb-1">
                <label htmlFor="password">Mật khẩu</label>
                <Link to="/forgot-password" className="text-xs text-cyan hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="input-with-icon">
                <Lock size={18} className="field-icon-left" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Nhập mật khẩu..."
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

            <button className="btn-auth-primary" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex-center gap-2">
                  <span className="spinner-dots" />
                  Đang xác thực...
                </span>
              ) : (
                <span className="flex-center gap-2">
                  Đăng nhập an toàn
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <div className="auth-card-footer">
            <p className="auth-switch-link">
              Chưa có tài khoản mã hóa? <Link to="/register">Đăng ký ngay</Link>
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
