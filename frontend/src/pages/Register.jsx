import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandPanel from '../components/BrandPanel';
import BackendConfigModal from '../components/BackendConfigModal';
import { getApiUrl } from '../api/http';
import http from '../api/http';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Server,
  RefreshCw,
} from 'lucide-react';

export default function Register() {
  const { register, sendRegisterOtp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending-otp | generating-keys | error
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [demoOtp, setDemoOtp] = useState(null);
  const [showBackendConfig, setShowBackendConfig] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    http
      .get('/health', { timeout: 3000 })
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  // Bước 1: Gửi mã OTP xác thực về Email
  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setDemoOtp(null);

    if (form.username.trim().length < 3) {
      setError('Tên hiển thị phải có ít nhất 3 ký tự.');
      return;
    }
    if (form.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    try {
      setStatus('sending-otp');
      const res = await sendRegisterOtp({
        email: form.email,
        username: form.username,
      });

      setInfoMessage(res.message || `Mã OTP đã được gửi đến email ${form.email}.`);
      if (res.demoOtp) {
        setDemoOtp(res.demoOtp);
      }
      setStep('otp');
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      if (!err.response) {
        setError(
          `Không thể kết nối tới Backend tại ${getApiUrl()}. Hãy kiểm tra xem bạn đã chạy: cd backend && npm run dev chưa.`
        );
        setBackendStatus('offline');
      } else {
        setError(err.response?.data?.error || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại thông tin.');
      }
    }
  }

  // Bước 2: Nhập OTP và tiến hành sinh khóa ElGamal + tạo tài khoản
  async function handleVerifyAndRegister(e) {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Vui lòng nhập mã OTP gồm 6 chữ số được gửi tới email của bạn.');
      return;
    }

    try {
      setStatus('generating-keys');
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        otp: otp.trim(),
      });
      navigate('/chat');
    } catch (err) {
      setStatus('error');
      if (!err.response) {
        setError(
          `Không thể kết nối tới Backend tại ${getApiUrl()}. Hãy kiểm tra xem bạn đã chạy: cd backend && npm run dev chưa.`
        );
        setBackendStatus('offline');
      } else {
        setError(err.response?.data?.error || 'Xác thực hoặc đăng ký thất bại.');
      }
    }
  }

  // Gửi lại mã OTP
  async function handleResendOtp() {
    setError('');
    try {
      setStatus('sending-otp');
      const res = await sendRegisterOtp({
        email: form.email,
        username: form.username,
      });
      setInfoMessage(res.message || `Đã gửi lại mã OTP tới ${form.email}.`);
      if (res.demoOtp) {
        setDemoOtp(res.demoOtp);
      }
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.error || 'Lỗi khi gửi lại mã OTP.');
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
            <h1 className="auth-heading">
              {step === 'form' ? 'Đăng ký tài khoản' : 'Xác thực Email'}
            </h1>
            <p className="auth-subheading">
              {step === 'form'
                ? 'Thiết lập tên hiển thị trong chat và xác thực hộp thư an toàn.'
                : `Nhập mã OTP 6 số đã được gửi tới ${form.email} để hoàn tất.`}
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
            </div>
          )}

          {infoMessage && !error && (
            <div className="auth-alert-message info" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div className="flex gap-2">
                <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-cyan" />
                <span>{infoMessage}</span>
              </div>
              {demoOtp && (
                <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(0,242,254,0.1)', borderRadius: 6, width: '100%' }}>
                  <span style={{ fontSize: 13, color: '#00f2fe', fontWeight: 600 }}>
                    🔑 Mã OTP (Mô phỏng): {demoOtp}
                  </span>
                </div>
              )}
            </div>
          )}

          {status === 'generating-keys' && (
            <div className="auth-alert-message info">
              <Cpu size={16} className="spinning-icon" />
              <span>Đang tính toán số học nguyên tố & sinh cặp khóa ElGamal 256-bit...</span>
            </div>
          )}

          {step === 'form' ? (
            /* BƯỚC 1: ĐIỀN THÔNG TIN ĐĂNG KÝ */
            <form className="auth-form-body" onSubmit={handleSendOtp}>
              <div className="input-field-group">
                <label htmlFor="username">Tên hiển thị (Tên hiện trong chat)</label>
                <div className="input-with-icon">
                  <User size={18} className="field-icon-left" />
                  <input
                    id="username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="vd: Nguyễn Văn A..."
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label htmlFor="email">Địa chỉ Email</label>
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
                disabled={status === 'sending-otp'}
              >
                {status === 'sending-otp' ? (
                  <span className="flex-center gap-2">
                    <span className="spinner-dots" />
                    Đang gửi mã OTP về mail...
                  </span>
                ) : (
                  <span className="flex-center gap-2">
                    Nhận mã OTP qua Email
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </form>
          ) : (
            /* BƯỚC 2: NHẬP MÃ OTP */
            <form className="auth-form-body" onSubmit={handleVerifyAndRegister}>
              <div className="input-field-group">
                <label htmlFor="otp">Mã xác thực OTP (6 chữ số)</label>
                <div className="input-with-icon">
                  <KeyRound size={18} className="field-icon-left" />
                  <input
                    id="otp"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Nhập mã 6 chữ số..."
                    required
                    autoFocus
                    style={{ letterSpacing: '4px', fontSize: '18px', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <button
                className="btn-auth-primary"
                type="submit"
                disabled={status === 'generating-keys' || status === 'sending-otp'}
              >
                {status === 'generating-keys' ? (
                  <span className="flex-center gap-2">
                    <span className="spinner-dots" />
                    Đang sinh khóa & tạo tài khoản...
                  </span>
                ) : (
                  <span className="flex-center gap-2">
                    Xác thực & Tạo tài khoản
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>

              <div className="flex-between mt-3 text-xs" style={{ width: '100%' }}>
                <button
                  type="button"
                  className="text-muted hover:underline flex-center gap-1"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => {
                    setStep('form');
                    setError('');
                  }}
                >
                  <ArrowLeft size={14} /> Sửa thông tin email
                </button>

                <button
                  type="button"
                  className="text-cyan hover:underline flex-center gap-1"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={handleResendOtp}
                  disabled={status === 'sending-otp'}
                >
                  <RefreshCw size={14} className={status === 'sending-otp' ? 'spinning-icon' : ''} /> Gửi lại mã
                </button>
              </div>
            </form>
          )}

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
