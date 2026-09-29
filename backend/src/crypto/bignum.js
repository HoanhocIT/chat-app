/**
 * bignum.js
 * Các hàm toán học số lớn (BigInt) dùng làm nền tảng cho ElGamal.
 */

const crypto = require('crypto');

/** Lũy thừa modulo nhanh: base^exp mod m (bình phương liên tiếp) */
function modPow(base, exp, mod) {
  base = ((base % mod) + mod) % mod;
  let result = 1n;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

/** Sinh số ngẫu nhiên an toàn có đúng `bits` bit */
function randomBigInt(bits) {
  const bytes = Math.ceil(bits / 8);
  return BigInt('0x' + crypto.randomBytes(bytes).toString('hex'));
}

/** Kiểm tra số nguyên tố bằng thuật toán Miller-Rabin (xác suất sai ~0) */
function isProbablePrime(n, rounds = 20) {
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

/**
 * Sinh số nguyên tố an toàn p = 2q + 1 (q cũng nguyên tố).
 * Dạng "safe prime" giúp việc tìm generator của nhóm Z*_p đơn giản và chắc chắn.
 */
function generateSafePrime(bits) {
  while (true) {
    let q = randomBigInt(bits - 1) | 1n;
    q |= (1n << BigInt(bits - 2));
    if (!isProbablePrime(q)) continue;
    const p = 2n * q + 1n;
    if (isProbablePrime(p)) return { p, q };
  }
}

/** Tìm phần tử sinh (generator) g của nhóm Z*_p, với p = 2q + 1 */
function findGenerator(p, q) {
  while (true) {
    const g = 2n + (randomBigInt(64) % (p - 3n));
    if (modPow(g, 2n, p) === 1n) continue;
    if (modPow(g, q, p) === 1n) continue;
    return g;
  }
}

/** Nghịch đảo modulo bằng thuật toán Euclid mở rộng: tìm a^-1 mod m */
function modInverse(a, m) {
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

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

module.exports = {
  modPow,
  randomBigInt,
  isProbablePrime,
  generateSafePrime,
  findGenerator,
  modInverse,
  gcd,
};
