import CipherReveal from './CipherReveal';
import { Shield, Lock, Key, FileCheck, CheckCircle2 } from 'lucide-react';

export default function BrandPanel() {
  return (
    <div className="auth-brand-pane">
      <div className="auth-brand-glow-orb" />
      <div className="auth-brand-grid-pattern" />

      {/* Top Header */}
      <div className="brand-header-row">
        <div className="brand-badge-shield">
          <Shield size={24} className="shield-neon" />
        </div>
        <div>
          <span className="brand-title-text">Chat<span className="text-cyan">-app</span></span>
          <span className="brand-version-pill">E2E Cryptographic</span>
        </div>
      </div>

      {/* Hero Content */}
      <div className="brand-hero-content">
        <h2 className="brand-hero-heading">
          Trò chuyện bảo mật <br />
          <span className="text-gradient-cyan">chuẩn toán học mã hóa</span>
        </h2>
        <p className="brand-hero-sub">
          Tin nhắn được mã hóa kép ngay trên thiết bị của bạn trước khi rời trình duyệt. Máy chủ chỉ là đường truyền trung gian không thể đọc dữ liệu.
        </p>

        {/* 3 Cryptographic Highlights */}
        <div className="crypto-features-list">
          <div className="crypto-feature-card">
            <div className="feature-icon-box">
              <Lock size={16} />
            </div>
            <div>
              <strong>AES-256-GCM</strong>
              <p>Mã hóa dữ liệu tốc độ cao kèm thẻ kiểm tra toàn vẹn 128-bit</p>
            </div>
          </div>

          <div className="crypto-feature-card">
            <div className="feature-icon-box">
              <Key size={16} />
            </div>
            <div>
              <strong>ElGamal Key Exchange</strong>
              <p>Trao khóa phiên an toàn trên nền số học modulo nguyên tố lớn</p>
            </div>
          </div>

          <div className="crypto-feature-card">
            <div className="feature-icon-box">
              <FileCheck size={16} />
            </div>
            <div>
              <strong>Chữ ký số ElGamal</strong>
              <p>Ký số bằng khóa riêng tư x, xác thực bằng cặp (r, s) chống giả mạo danh tính</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cipher Terminal Animation Bar */}
      <div className="brand-terminal-bar">
        <div className="terminal-header-dots">
          <span className="term-dot red" />
          <span className="term-dot yellow" />
          <span className="term-dot green" />
          <span className="term-title">cipher-engine@e2e:~$</span>
        </div>
        <CipherReveal />
      </div>
    </div>
  );
}
