/**
 * avatar.js
 * Tiện ích hiển thị avatar chữ cái, gradient màu ngẫu nhiên nhưng cố định theo tên,
 * định dạng thời gian và rút gọn chuỗi mã hóa.
 */

const GRADIENTS = [
  ['#3B82F6', '#8B5CF6'], // Blue -> Purple
  ['#06B6D4', '#3B82F6'], // Cyan -> Blue
  ['#10B981', '#059669'], // Emerald -> Green
  ['#F59E0B', '#EF4444'], // Amber -> Red
  ['#EC4899', '#8B5CF6'], // Pink -> Purple
  ['#6366F1', '#4F46E5'], // Indigo
  ['#14B8A6', '#06B6D4'], // Teal -> Cyan
  ['#8B5CF6', '#D946EF'], // Violet -> Fuchsia
];

export function getAvatarGradient(name = 'U') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  const [from, to] = GRADIENTS[index];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

export function getInitials(name = '') {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (isToday) {
    return `${hours}:${minutes}`;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${hours}:${minutes} ${day}/${month}`;
}

export function truncateHex(str = '', prefixLen = 6, suffixLen = 6) {
  if (!str) return '—';
  if (str.length <= prefixLen + suffixLen + 3) return str;
  return `${str.slice(0, prefixLen)}...${str.slice(-suffixLen)}`;
}
