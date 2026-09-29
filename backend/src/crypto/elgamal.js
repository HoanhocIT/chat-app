/**
 * elgamal.js
 * Mã hóa bất đối xứng ElGamal. Dùng để mã hóa khóa AES phiên (session key)
 * trong mô hình hybrid — không dùng để mã hóa trực tiếp nội dung tin nhắn dài.
 */

const { modPow, randomBigInt, generateSafePrime, findGenerator, modInverse, gcd } = require('./bignum');

/**
 * Sinh cặp khóa ElGamal.
 * @param {number} bits - độ dài số nguyên tố p. Demo dùng 256, thực tế nên >= 2048.
 */
function generateKeyPair(bits = 256) {
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
  return Math.floor((bitLength - 1) / 8); // đảm bảo mỗi khối m < p
}

/** Mã hóa message (chuỗi bất kỳ độ dài) bằng khóa công khai của người nhận */
function encrypt(message, publicKeyRaw) {
  const { p, g, y } = toBigInt(publicKeyRaw);
  const blockSize = blockSizeBytes(p);
  const buffer = Buffer.from(message, 'utf8');
  const chunks = [];

  for (let i = 0; i < buffer.length; i += blockSize) {
    const block = buffer.subarray(i, i + blockSize);
    const m = BigInt('0x' + block.toString('hex'));

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

/** Giải mã bằng khóa bí mật của mình, ghép các khối lại thành message gốc */
function decrypt(chunks, privateKeyRaw) {
  const { p, x } = toBigInt(privateKeyRaw);

  const buffers = chunks.map(({ c1, c2 }) => {
    const C1 = BigInt(c1);
    const C2 = BigInt(c2);
    const s = modPow(C1, x, p);
    const m = (C2 * modInverse(s, p)) % p;

    let hex = m.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    return Buffer.from(hex, 'hex');
  });

  return Buffer.concat(buffers).toString('utf8');
}

module.exports = { generateKeyPair, encrypt, decrypt };
