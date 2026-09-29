/**
 * theme.js
 * Quản lý đổi màu giao diện cho Chat-app (Theme Customization).
 * Lưu vào localStorage và cập nhật biến CSS thời gian thực.
 */

export const THEMES = [
  {
    id: 'cyber-cyan',
    name: 'Cyber Cyan',
    accent: '#00f2fe',
    darkAccent: '#0891b2',
    glow: 'rgba(0, 242, 254, 0.25)',
    gradient: 'linear-gradient(135deg, #00f2fe 0%, #0891b2 100%)',
    mineGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    mineShadow: 'rgba(2, 132, 199, 0.3)',
    border: 'rgba(0, 242, 254, 0.4)',
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    accent: '#10b981',
    darkAccent: '#059669',
    glow: 'rgba(16, 185, 129, 0.25)',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    mineGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    mineShadow: 'rgba(5, 150, 105, 0.3)',
    border: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'neon-purple',
    name: 'Neon Purple',
    accent: '#a855f7',
    darkAccent: '#7e22ce',
    glow: 'rgba(168, 85, 247, 0.25)',
    gradient: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)',
    mineGradient: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)',
    mineShadow: 'rgba(126, 34, 206, 0.3)',
    border: 'rgba(168, 85, 247, 0.4)',
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    accent: '#f59e0b',
    darkAccent: '#d97706',
    glow: 'rgba(245, 158, 11, 0.25)',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
    mineGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    mineShadow: 'rgba(217, 119, 6, 0.3)',
    border: 'rgba(245, 158, 11, 0.4)',
  },
  {
    id: 'electric-blue',
    name: 'Electric Blue',
    accent: '#3b82f6',
    darkAccent: '#1d4ed8',
    glow: 'rgba(59, 130, 246, 0.25)',
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    mineGradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    mineShadow: 'rgba(37, 99, 235, 0.3)',
    border: 'rgba(59, 130, 246, 0.4)',
  },
  {
    id: 'rose-pink',
    name: 'Rose Pink',
    accent: '#f43f5e',
    darkAccent: '#be123c',
    glow: 'rgba(244, 63, 94, 0.25)',
    gradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
    mineGradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    mineShadow: 'rgba(225, 29, 72, 0.3)',
    border: 'rgba(244, 63, 94, 0.4)',
  },
];

const STORAGE_KEY = 'chat_app_theme';

export function getActiveThemeId() {
  if (typeof window === 'undefined') return 'cyber-cyan';
  return localStorage.getItem(STORAGE_KEY) || 'cyber-cyan';
}

export function applyTheme(themeId) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const root = document.documentElement;

  root.style.setProperty('--cyan-neon', theme.accent);
  root.style.setProperty('--cyan-dark', theme.darkAccent);
  root.style.setProperty('--cyan-glow', theme.glow);
  root.style.setProperty('--theme-gradient', theme.gradient);
  root.style.setProperty('--theme-mine-gradient', theme.mineGradient);
  root.style.setProperty('--theme-mine-shadow', theme.mineShadow);
  root.style.setProperty('--border-cyan', theme.border);

  localStorage.setItem(STORAGE_KEY, theme.id);
  return theme;
}

export function initTheme() {
  const saved = getActiveThemeId();
  return applyTheme(saved);
}
