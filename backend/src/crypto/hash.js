/**
 * hash.js
 * SHA-256: Chuẩn hàm băm an toàn 256-bit dùng cho chữ ký số và kiểm tra toàn vẹn dữ liệu.
 */

const crypto = require('crypto');

function sha256(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

module.exports = { sha256 };
