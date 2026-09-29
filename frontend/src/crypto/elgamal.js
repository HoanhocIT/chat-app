/**
 * elgamal.js (browser)
 * Sinh khóa và mã hóa/giải mã ElGamal — chạy hoàn toàn trên trình duyệt.
 * Private key KHÔNG BAO GIỜ rời khỏi máy người dùng.
 */

import {
  modPow,
  randomBigInt,
  generateSafePrime,
  findGenerator,
  modInverse,
  gcd,
  bytesToHex,
  hexToBytes,
} from './bignum';

export function generateKeyPair(bits = 256) {
  const { p, q } = generateSafePrime(bits);
  const g = findGenerator(p, q);

  let x;
  do {
    x = 1n + (randomBigInt(bits) % (p - 2n));
  } while (x <= 1n);

  const y = modPow(g, x, p);

  return {
    publicKey: { p: p.toString(), g: g.toString(), y: y.toString() },
    privateKey: { p: p.toString(), g: g.toString(), x: x.toString() },
  };
}

function toBigInt(keyObj) {
  const out = {};
  for (const k in keyObj) out[k] = BigInt(keyObj[k]);
  return out;
}

function blockSizeBytes(p) {
  const bitLength = p.toString(2).length;
  return Math.floor((bitLength - 1) / 8);
}

export function encrypt(message, publicKeyRaw) {
  const { p, g, y } = toBigInt(publicKeyRaw);
  const blockSize = blockSizeBytes(p);
  const buffer = new TextEncoder().encode(message);
  const chunks = [];

  for (let i = 0; i < buffer.length; i += blockSize) {
    const block = buffer.subarray(i, i + blockSize);
    const m = BigInt('0x' + bytesToHex(block));

    let k;
    do {
      k = 1n + (randomBigInt(64) % (p - 2n));
    } while (gcd(k, p - 1n) !== 1n);

    const c1 = modPow(g, k, p);
    const c2 = (m * modPow(y, k, p)) % p;
    chunks.push({ c1: c1.toString(), c2: c2.toString() });
  }

  return chunks;
}

export function decrypt(chunks, privateKeyRaw) {
  const { p, x } = toBigInt(privateKeyRaw);

  const parts = chunks.map(({ c1, c2 }) => {
    const C1 = BigInt(c1);
    const C2 = BigInt(c2);
    const s = modPow(C1, x, p);
    const m = (C2 * modInverse(s, p)) % p;

    let hex = m.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    return hexToBytes(hex);
  });

  const totalLen = parts.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return new TextDecoder().decode(result);
}
