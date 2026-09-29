/**
 * signature.js
 * Chữ ký số theo lược đồ ElGamal Signature Scheme.
 * Ký trên SHA-256(message) thay vì message gốc — đúng chuẩn thực hành.
 */

const { modPow, randomBigInt, modInverse, gcd } = require('./bignum');
const { sha256 } = require('./hash');

function sign(message, privateKeyRaw) {
  const p = BigInt(privateKeyRaw.p);
  const g = BigInt(privateKeyRaw.g);
  const x = BigInt(privateKeyRaw.x);

  const hash = BigInt('0x' + sha256(message)) % (p - 1n);

  let k, r;
  do {
    do {
      k = 1n + (randomBigInt(64) % (p - 2n));
    } while (gcd(k, p - 1n) !== 1n);
    r = modPow(g, k, p);
  } while (r === 0n);

  const kInv = modInverse(k, p - 1n);
  const s = (kInv * (((hash - x * r) % (p - 1n)) + (p - 1n))) % (p - 1n);

  return { r: r.toString(), s: s.toString() };
}

/** Kiểm tra: g^H(m) mod p == (y^r * r^s) mod p */
function verify(message, signature, publicKeyRaw) {
  const p = BigInt(publicKeyRaw.p);
  const g = BigInt(publicKeyRaw.g);
  const y = BigInt(publicKeyRaw.y);
  const r = BigInt(signature.r);
  const s = BigInt(signature.s);

  if (r <= 0n || r >= p) return false;

  const hash = BigInt('0x' + sha256(message)) % (p - 1n);
  const left = modPow(g, hash, p);
  const right = (modPow(y, r, p) * modPow(r, s, p)) % p;

  return left === right;
}

module.exports = { sign, verify };
