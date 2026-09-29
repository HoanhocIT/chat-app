import { useEffect, useState } from 'react';

const SCRAMBLE_CHARS = '01ABCDEF#$%&*+=-/\\';
const PHRASES = [
  'AES-256-GCM · session key',
  'ElGamal · trao khóa bất đối xứng',
  'SHA-256 · toàn vẹn dữ liệu',
  'Chữ ký số · chống giả mạo',
];

function randomChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

/**
 * Hiệu ứng: từng ký tự của phrase hiện ra sau vài vòng nhiễu ngẫu nhiên,
 * mô phỏng cảm giác "giải mã". Chạy 1 chuỗi động duy nhất, không lặp lại
 * hiệu ứng ở nhiều nơi khác trên trang.
 */
export default function CipherReveal() {
  const [display, setDisplay] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const target = PHRASES[phraseIndex];
    let frame = 0;
    const totalFrames = target.length * 3;

    const interval = setInterval(() => {
      const revealCount = Math.floor(frame / 3);
      const next = target
        .split('')
        .map((ch, i) => (ch === ' ' ? ' ' : i < revealCount ? ch : randomChar()))
        .join('');
      setDisplay(next);

      frame++;
      if (frame > totalFrames) {
        clearInterval(interval);
        setTimeout(() => setPhraseIndex((i) => (i + 1) % PHRASES.length), 1400);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [phraseIndex]);

  return <div className="auth-cipher-line">{display || '\u00A0'}</div>;
}
