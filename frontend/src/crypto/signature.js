/**
 * signature.js (browser)
 * Ký số & xác thực theo lược đồ ElGamal Signature, băm bằng SHA-256.
 * Vì crypto.subtle.digest là async, sign/verify ở đây cũng là async
 * (khác 1 chút so với bản backend là sync).
 */

import { modPow, randomBigInt, modInverse, gcd } from './bignum';
import { sha256 } from './hash';

export async function sign(message, privateKeyRaw) {
  const p = BigInt(privateKeyRaw.p);
  const g = BigInt(privateKeyRaw.g);
  const x = BigInt(privateKeyRaw.x);

  const hashHex = await sha256(message);
  const hash = BigInt('0x' + hashHex) % (p - 1n);

  let k, r, s;
  do {
    do {
      k = 1n + (randomBigInt(256) % (p - 2n));
    } while (gcd(k, p - 1n) !== 1n);
    r = modPow(g, k, p);
    if (r === 0n) continue;

    const kInv = modInverse(k, p - 1n);
    s = (kInv * (((hash - x * r) % (p - 1n)) + (p - 1n))) % (p - 1n);
  } while (r === 0n || s === 0n);

  return { r: r.toString(), s: s.toString() };
}

export async function verify(message, signature, publicKeyRaw) {
  const p = BigInt(publicKeyRaw.p);
  const g = BigInt(publicKeyRaw.g);
  const y = BigInt(publicKeyRaw.y);
  const r = BigInt(signature.r);
  const s = BigInt(signature.s);

  // Kiểm tra tính hợp lệ của cặp chữ ký (r, s) theo chuẩn ElGamal
  if (r <= 0n || r >= p || s <= 0n || s >= (p - 1n)) return false;

  const hashHex = await sha256(message);
  const hash = BigInt('0x' + hashHex) % (p - 1n);
  const left = modPow(g, hash, p);
  const right = (modPow(y, r, p) * modPow(r, s, p)) % p;

  return left === right;
}
