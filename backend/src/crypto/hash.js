/**
 * hash.js
 * SHA-256: dùng thật trong hệ thống (ký số, kiểm tra toàn vẹn file).
 * MD5: giữ lại để so sánh/minh họa trong báo cáo đề tài — KHÔNG dùng cho bảo mật
 *      thật (đã bị chứng minh có collision từ 2004).
 */

const crypto = require('crypto');

function sha256(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function md5(data) {
  return crypto.createHash('md5').update(data, 'utf8').digest('hex');
}

/** So sánh tốc độ 2 thuật toán — dùng cho phần "thực nghiệm & đánh giá" trong báo cáo */
function compareHashSpeed(data, iterations = 10000) {
  const t1 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) md5(data + i);
  const t2 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) sha256(data + i);
  const t3 = process.hrtime.bigint();

  return {
    md5_ms: Number(t2 - t1) / 1e6,
    sha256_ms: Number(t3 - t2) / 1e6,
    iterations,
  };
}

module.exports = { sha256, md5, compareHashSpeed };
