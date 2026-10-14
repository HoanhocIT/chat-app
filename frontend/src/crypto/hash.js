/**
 * hash.js (browser)
 * SHA-256: Chuẩn hàm băm an toàn 256-bit (FIPS 180-4) dùng cho chữ ký số ElGamal và kiểm tra toàn vẹn dữ liệu.
 */

export async function sha256(message) {
  const encoded = new TextEncoder().encode(message);
  const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
