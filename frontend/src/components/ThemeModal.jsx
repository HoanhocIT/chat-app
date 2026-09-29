import { useState, useEffect } from 'react';
import { Palette, Check, X, Sparkles } from 'lucide-react';
import { THEMES, getActiveThemeId, applyTheme } from '../utils/theme';

export default function ThemeModal({ isOpen, onClose }) {
  const [activeTheme, setActiveTheme] = useState(getActiveThemeId());

  useEffect(() => {
    setActiveTheme(getActiveThemeId());
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSelectTheme(themeId) {
    setActiveTheme(themeId);
    applyTheme(themeId);
  }

  const current = THEMES.find((t) => t.id === activeTheme) || THEMES[0];

  return (
    <div className="crypto-modal-backdrop" onClick={onClose}>
      <div className="crypto-modal-window theme-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="crypto-modal-header">
          <div className="crypto-modal-title">
            <div className="crypto-modal-icon-badge">
              <Palette size={18} />
            </div>
            <div>
              <h3>Đổi màu giao diện Chat-app</h3>
              <p>Tùy chỉnh phong cách màu sắc cho toàn bộ ứng dụng</p>
            </div>
          </div>
          <button className="crypto-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="crypto-modal-body">
          <div className="theme-grid-selection">
            {THEMES.map((theme) => {
              const isSelected = activeTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  className={`theme-card-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectTheme(theme.id)}
                >
                  <div
                    className="theme-circle-preview"
                    style={{ background: theme.gradient }}
                  >
                    {isSelected && <Check size={16} className="text-white" />}
                  </div>
                  <div className="theme-name-label">{theme.name}</div>
                </button>
              );
            })}
          </div>

          {/* Live Preview Box */}
          <div className="theme-preview-card">
            <div className="theme-preview-head">
              <Sparkles size={14} className="text-cyan" />
              <span>Xem trước giao diện ({current.name})</span>
            </div>
            <div className="theme-preview-content">
              <div className="preview-bubble mine" style={{ background: current.mineGradient }}>
                <span>Tin nhắn của bạn sẽ trông như thế này!</span>
              </div>
              <div className="preview-action-row">
                <button className="preview-btn" style={{ background: current.gradient }}>
                  Nút bấm chính
                </button>
                <span className="preview-badge" style={{ color: current.accent, borderColor: current.border }}>
                  ✓ Đã mã hóa
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
