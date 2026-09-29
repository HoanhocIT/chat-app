/**
 * aes.js (browser)
 * Dùng Web Crypto SubtleCrypto cho AES-256-GCM. SubtleCrypto trả về
 * ciphertext + authTag gộp chung 1 buffer — tách riêng ra để khớp định dạng
 * { iv, authTag, data } giống backend (Node's crypto module).
 */

import { bytesToHex, hexToBytes } from './bignum';

const TAG_LENGTH_BYTES = 16;

export async function generateAesKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function exportAesKeyHex(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bytesToHex(new Uint8Array(raw));
}

export async function importAesKeyFromHex(hex) {
  const raw = hexToBytes(hex);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

export async function encryptAES(message, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(message);
  const cipherBuf = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded));

  const data = cipherBuf.slice(0, cipherBuf.length - TAG_LENGTH_BYTES);
  const authTag = cipherBuf.slice(cipherBuf.length - TAG_LENGTH_BYTES);

  return {
    iv: bytesToHex(iv),
    authTag: bytesToHex(authTag),
    data: bytesToHex(data),
  };
}

export async function decryptAES(payload, key) {
  const { iv, authTag, data } = payload;
  const ivBytes = hexToBytes(iv);
  const dataBytes = hexToBytes(data);
  const tagBytes = hexToBytes(authTag);

  const combined = new Uint8Array(dataBytes.length + tagBytes.length);
  combined.set(dataBytes, 0);
  combined.set(tagBytes, dataBytes.length);

  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, combined);
  return new TextDecoder().decode(plainBuf);
}
