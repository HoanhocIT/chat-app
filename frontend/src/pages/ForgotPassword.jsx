import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BrandPanel from '../components/BrandPanel';
import http from '../api/http';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: nhập email, 2: nhập OTP + mật khẩu mới
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [demoOtp, setDemoOtp] = useState('');

  // Bước 1: Gửi yêu cầu OTP qua Email
  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const { data } = await http.post('/auth/forgot-password', { email }, { timeout: 15000 });
      setSuccessMsg(data.message || 'Mã xác nhận đã được gửi!');
      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
        setOtp(data.demoOtp); // Tự động điền cho tiện kiểm thử
      }
      setStep(2);
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Quá thời gian kết nối (Timeout). Vui lòng thử lại.');
      } else {
        setError(err.response?.data?.error || 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Bước 2: Xác nhận OTP và đặt lại mật khẩu mới
  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 8) {
      return setError('Mật khẩu mới phải có ít nhất 8 ký tự');
    }
    if (newPassword !== confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp');
    }

    setLoading(true);
    try {
      const { data } = await http.post('/auth/reset-password', {
        email,
        otp: otp.trim(),
        newPassword,
      });

      setSuccessMsg(data.message || 'Đặt lại mật khẩu thành công!');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.');
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
              <KeyRound size={16} />
              <span>Khôi phục tài khoản</span>
            </div>
            <h1 className="auth-heading">
              {step === 1 ? 'Quên mật khẩu?' : 'Đặt lại mật khẩu mới'}
            </h1>
            <p className="auth-subheading">
              {step === 1
                ? 'Nhập địa chỉ email đăng ký để nhận mã xác thực OTP đặt lại mật khẩu.'
                : `Nhập mã xác thực gửi về ${email} và mật khẩu mới của bạn.`}
            </p>
          </div>

          {error && (
            <div className="auth-alert-message error">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert-message info">
              <CheckCircle2 size={16} className="flex-shrink-0 text-emerald" />
              <span>{successMsg}</span>
            </div>
          )}

          {demoOtp && step === 2 && (
            <div
              className="p-3 bg-dark rounded border border-cyan text-xs leading-relaxed text-cyan mb-3 flex items-center justify-between"
              style={{ background: 'rgba(0, 242, 254, 0.08)' }}
            >
              <div>
                🧪 <strong>Chế độ thử nghiệm:</strong> Mã OTP của bạn là: <strong className="font-mono text-emerald text-sm">{demoOtp}</strong>
              </div>
              <button
                type="button"
                className="text-xs text-cyan underline ml-2"
                onClick={() => setOtp(demoOtp)}
              >
                Tự động điền
              </button>
            </div>
          )}

          {step === 1 ? (
            /* FORM BƯỚC 1: NHẬP EMAIL */
            <form className="auth-form-body" onSubmit={handleSendOtp}>
              <div className="input-field-group">
                <label htmlFor="email">Email đã đăng ký</label>
                <div className="input-with-icon">
                  <Mail size={18} className="field-icon-left" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button className="btn-auth-primary" type="submit" disabled={loading}>
                {loading ? (
                  <span className="flex-center gap-2">
                    <span className="spinner-dots" />
                    Đang gửi email...
                  </span>
                ) : (
                  <span className="flex-center gap-2">
                    Gửi mã xác nhận qua Email
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </form>
          ) : (
            /* FORM BƯỚC 2: NHẬP OTP VÀ MẬT KHẨU MỚI */
            <form className="auth-form-body" onSubmit={handleResetPassword}>
              <div className="input-field-group">
                <label htmlFor="otp">Mã xác thực OTP (6 chữ số)</label>
                <div className="input-with-icon">
                  <KeyRound size={18} className="field-icon-left" />
                  <input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Ví dụ: 123456"
                    maxLength={6}
                    required
                    autoFocus
                    style={{ letterSpacing: '4px', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label htmlFor="newPassword">Mật khẩu mới (ít nhất 8 ký tự)</label>
                <div className="input-with-icon">
                  <Lock size={18} className="field-icon-left" />
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
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

              <div className="input-field-group">
                <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
                <div className="input-with-icon">
                  <Lock size={18} className="field-icon-left" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    required
                  />
                </div>
              </div>

              <button className="btn-auth-primary" type="submit" disabled={loading}>
                {loading ? (
                  <span className="flex-center gap-2">
                    <span className="spinner-dots" />
                    Đang đặt lại mật khẩu...
                  </span>
                ) : (
                  <span className="flex-center gap-2">
                    Xác nhận đổi mật khẩu
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>

              <div className="flex-between mt-2">
                <button
                  type="button"
                  className="crypto-link-btn"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={13} />
                  <span>Gửi lại mã hoặc đổi email</span>
                </button>
              </div>
            </form>
          )}

          <div className="auth-card-footer">
            <p className="auth-switch-link">
              Nhớ mật khẩu? <Link to="/login">Quay lại đăng nhập</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
