/**
 * demo.js
 * Chạy: node src/crypto/demo.js
 * Kiểm tra toàn bộ luồng: sinh khóa → mã hóa hybrid → giải mã → ký số → xác thực → so sánh hash.
 */

const elgamal = require('./elgamal');
const hybrid = require('./hybrid');
const signature = require('./signature');
const { sha256, md5, compareHashSpeed } = require('./hash');

console.log('=== 1. Sinh cặp khóa ElGamal (256-bit demo) ===');
console.time('Sinh khóa');
const { publicKey, privateKey } = elgamal.generateKeyPair(256);
console.timeEnd('Sinh khóa');
console.log('Public key:', publicKey);

console.log('\n=== 2. Mã hóa lai Hybrid (AES-256-GCM + ElGamal) ===');
const message = 'Xin chào! Đây là tin nhắn bí mật trong đồ án chat app. '.repeat(30);

console.time('Hybrid encrypt+decrypt');
const encrypted = hybrid.hybridEncrypt(message, publicKey);
const decrypted = hybrid.hybridDecrypt(encrypted, privateKey);
console.timeEnd('Hybrid encrypt+decrypt');

console.log('Giải mã đúng:', decrypted === message ? '✅ ĐÚNG' : '❌ SAI');
console.log('Số khối ElGamal (chỉ để mã hóa khóa AES):', encrypted.encryptedKeyChunks.length);

console.log('\n=== 3. Ký số & xác thực (ElGamal Signature + SHA-256) ===');
const sig = signature.sign(message, privateKey);
const isValid = signature.verify(message, sig, publicKey);
console.log('Xác thực chữ ký hợp lệ:', isValid ? '✅ HỢP LỆ' : '❌ KHÔNG HỢP LỆ');

const tamperedValid = signature.verify('Nội dung đã bị sửa!', sig, publicKey);
console.log('Xác thực với nội dung bị sửa:', tamperedValid ? '❌ (lỗi bảo mật!)' : '✅ Phát hiện giả mạo đúng');

console.log('\n=== 4. So sánh SHA-256 vs MD5 ===');
console.log('SHA-256("hello"):', sha256('hello'), '(256 bit)');
console.log('MD5("hello")   :', md5('hello'), '(128 bit)');
console.log('Benchmark tốc độ (10.000 lần băm):', compareHashSpeed('sample data'));
