/**
 * hybrid.js (browser)
 * AES mã hóa nội dung + ElGamal mã hóa khóa AES. Toàn bộ chạy phía client.
 */

import * as elgamal from './elgamal';
import { generateAesKey, exportAesKeyHex, importAesKeyFromHex, encryptAES, decryptAES } from './aes';

export async function hybridEncrypt(message, publicKey) {
  const aesKey = await generateAesKey();
  const aesKeyHex = await exportAesKeyHex(aesKey);
  const encryptedMessage = await encryptAES(message, aesKey);
  const encryptedKeyChunks = elgamal.encrypt(aesKeyHex, publicKey);

  return { encryptedMessage, encryptedKeyChunks };
}

export async function hybridDecrypt({ encryptedMessage, encryptedKeyChunks }, privateKey) {
  const aesKeyHex = elgamal.decrypt(encryptedKeyChunks, privateKey);
  const aesKey = await importAesKeyFromHex(aesKeyHex);
  return decryptAES(encryptedMessage, aesKey);
}
