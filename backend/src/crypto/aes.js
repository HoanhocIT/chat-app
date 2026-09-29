/**
 * aes.js
 * Mã hóa đối xứng AES-256-GCM — dùng để mã hóa nội dung tin nhắn thật.
 * GCM cung cấp cả confidentiality (mã hóa) lẫn integrity (authTag) trong 1 bước.
 */

const crypto = require('crypto');

/** Sinh khóa AES-256 ngẫu nhiên (32 byte), dùng 1 lần cho 1 tin nhắn */
function generateAesKey() {
  return crypto.randomBytes(32);
}

function encryptAES(message, key) {
  const iv = crypto.randomBytes(12); // 12 byte là chuẩn khuyến nghị cho GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(message, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    data: encrypted.toString('hex'),
  };
}

/** Giải mã. Nếu dữ liệu bị chỉnh sửa, authTag không khớp → tự động throw lỗi */
function decryptAES(payload, key) {
  const { iv, authTag, data } = payload;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

module.exports = { generateAesKey, encryptAES, decryptAES };
