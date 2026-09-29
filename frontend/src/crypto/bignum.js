/**
 * bignum.js (browser)
 * Giống hệt logic toán học ở backend/src/crypto/bignum.js, chỉ khác nguồn
 * sinh số ngẫu nhiên: dùng Web Crypto API (window.crypto) thay vì Node's crypto module.
 */

export function modPow(base, exp, mod) {
  base = ((base % mod) + mod) % mod;
  let result = 1n;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

export function randomBigInt(bits) {
  const bytes = Math.ceil(bits / 8);
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
  return BigInt('0x' + hex);
}

export function isProbablePrime(n, rounds = 20) {
  if (n < 2n) return false;
  if (n === 2n || n === 3n) return true;
  if (n % 2n === 0n) return false;

  let r = 0n;
  let d = n - 1n;
  while (d % 2n === 0n) {
    d /= 2n;
    r += 1n;
  }

  witnessLoop:
  for (let i = 0; i < rounds; i++) {
    const a = 2n + (randomBigInt(64) % (n - 3n));
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let j = 0n; j < r - 1n; j++) {
      x = modPow(x, 2n, n);
      if (x === n - 1n) continue witnessLoop;
    }
    return false;
  }
  return true;
}

export function generateSafePrime(bits) {
  while (true) {
    let q = randomBigInt(bits - 1) | 1n;
    q |= (1n << BigInt(bits - 2));
    if (!isProbablePrime(q)) continue;
    const p = 2n * q + 1n;
    if (isProbablePrime(p)) return { p, q };
  }
}

export function findGenerator(p, q) {
  while (true) {
    const g = 2n + (randomBigInt(64) % (p - 3n));
    if (modPow(g, 2n, p) === 1n) continue;
    if (modPow(g, q, p) === 1n) continue;
    return g;
  }
}

export function modInverse(a, m) {
  a = ((a % m) + m) % m;
  let [oldR, r] = [a, m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }
  if (oldR !== 1n) throw new Error('Không tồn tại nghịch đảo modulo');
  return ((oldS % m) + m) % m;
}

export function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

export function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex) {
  if (hex.length % 2) hex = '0' + hex;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}
