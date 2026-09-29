/**
 * hybrid.js
 * Mã hóa lai (hybrid encryption) — kiến trúc dùng trong Signal/WhatsApp:
 * AES mã hóa nội dung (nhanh) + ElGamal mã hóa khóa AES (trao khóa an toàn).
 */

const elgamal = require('./elgamal');
const aes = require('./aes');

/**
 * @param {string} message - nội dung tin nhắn gốc
 * @param {object} publicKey - public key ElGamal của người nhận
 * @returns {{ encryptedMessage: object, encryptedKeyChunks: object[] }}
 */
function hybridEncrypt(message, publicKey) {
  const aesKey = aes.generateAesKey();
  const encryptedMessage = aes.encryptAES(message, aesKey);
  const encryptedKeyChunks = elgamal.encrypt(aesKey.toString('hex'), publicKey);

  return { encryptedMessage, encryptedKeyChunks };
}

/**
 * @param {object} payload - { encryptedMessage, encryptedKeyChunks }
 * @param {object} privateKey - private key ElGamal của người nhận
 * @returns {string} nội dung tin nhắn gốc
 */
function hybridDecrypt({ encryptedMessage, encryptedKeyChunks }, privateKey) {
  const aesKeyHex = elgamal.decrypt(encryptedKeyChunks, privateKey);
  const aesKey = Buffer.from(aesKeyHex, 'hex');
  return aes.decryptAES(encryptedMessage, aesKey);
}

module.exports = { hybridEncrypt, hybridDecrypt };
