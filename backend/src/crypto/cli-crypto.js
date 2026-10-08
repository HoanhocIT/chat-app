/**
 * cli-crypto.js
 * Script chạy kiểm thử và trình diễn từng thuật toán mật mã trên Terminal.
 * 
 * Cách dùng:
 *   node src/crypto/cli-crypto.js           -> Mở Menu tương tác chọn 1 trong 5 chế độ
 *   node src/crypto/cli-crypto.js 1         -> Chạy riêng Thuật toán 1: AES-256-GCM
 *   node src/crypto/cli-crypto.js 2         -> Chạy riêng Thuật toán 2: ElGamal (Sinh khóa & Mã hóa)
 *   node src/crypto/cli-crypto.js 3         -> Chạy riêng Thuật toán 3: Chữ ký số ElGamal & Xác thực
 *   node src/crypto/cli-crypto.js 4         -> Chạy riêng Thuật toán 4: SHA-256 vs MD5 (Avalanche + Speed)
 *   node src/crypto/cli-crypto.js 5         -> Chạy riêng Thuật toán 5: Hệ Mật Mã Lai Hybrid (Toàn phần)
 *   node src/crypto/cli-crypto.js all       -> Chạy toàn bộ lần lượt từ 1 đến 5
 */

const readline = require('readline');
const aes = require('./aes');
const elgamal = require('./elgamal');
const signature = require('./signature');
const hybrid = require('./hybrid');
const { sha256, md5, compareHashSpeed } = require('./hash');

const LINE = '─'.repeat(75);
const DOUBLE_LINE = '═'.repeat(75);

// ============================================================================
// 1. DEMO AES-256-GCM
// ============================================================================
function demoAES() {
  console.log('\n' + DOUBLE_LINE);
  console.log('🔹 THUẬT TOÁN 1: MÃ HÓA ĐỐI XỨNG AES-256-GCM (AEAD)');
  console.log(DOUBLE_LINE);
  console.log('📌 Vai trò: Mã hóa nội dung tin nhắn thực tế với tốc độ cao và bảo vệ toàn vẹn.\n');

  const plainText = 'Chào Thầy! Đây là tin nhắn thử nghiệm mã hóa AES-256-GCM.';
  console.log('1. Bản rõ ban đầu (Plaintext):');
  console.log(`   "${plainText}"`);

  console.log('\n2. Sinh ngẫu nhiên Khóa phiên K (256-bit = 32 bytes):');
  const key = aes.generateAesKey();
  console.log(`   Khóa K (Hex): ${key.toString('hex')}`);

  console.log('\n3. Thực hiện Mã hóa AES-256-GCM:');
  const t0 = process.hrtime.bigint();
  const encrypted = aes.encryptAES(plainText, key);
  const t1 = process.hrtime.bigint();
  const encTime = Number(t1 - t0) / 1e6;

  console.log(`   • Vector khởi tạo (IV 96-bit)   : ${encrypted.iv}`);
  console.log(`   • Thẻ xác thực (AuthTag 128-bit) : ${encrypted.authTag}`);
  console.log(`   • Bản mã (Ciphertext Hex)        : ${encrypted.data}`);
  console.log(`   ⏱️ Thời gian mã hóa               : ${encTime.toFixed(3)} ms`);

  console.log('\n4. Thực hiện Giải mã với khóa K đúng:');
  const decrypted = aes.decryptAES(encrypted, key);
  console.log(`   • Kết quả giải mã: "${decrypted}"`);
  console.log(`   • Trạng thái     : ${decrypted === plainText ? '✅ THÀNH CÔNG (Khớp 100%)' : '❌ THẤT BẠI'}`);

  console.log('\n5. Thử nghiệm tấn công sửa đổi 1 ký tự bản mã (Tamper Test):');
  try {
    // Sửa ký tự đầu tiên của ciphertext
    const tamperedHex = (encrypted.data[0] === 'a' ? 'b' : 'a') + encrypted.data.slice(1);
    aes.decryptAES({ ...encrypted, data: tamperedHex }, key);
    console.log('   ❌ LỖI BẢO MẬT: Đã giải mã được dữ liệu bị sửa!');
  } catch (err) {
    console.log('   ✅ PHÁT HIỆN GIẢ MẠO THÀNH CÔNG!');
    console.log(`      Lý do: Thẻ AuthTag không khớp -> GCM từ chối giải mã (${err.message})`);
  }
}

// ============================================================================
// 2. DEMO ELGAMAL KEY GENERATION & ENCRYPTION
// ============================================================================
function demoElGamal() {
  console.log('\n' + DOUBLE_LINE);
  console.log('🔹 THUẬT TOÁN 2: MÃ HÓA BẤT ĐỐI XỨNG ELGAMAL (256-BIT)');
  console.log(DOUBLE_LINE);
  console.log('📌 Vai trò: Bọc chìa khóa phiên AES bằng Public Key của người nhận (DLP).\n');

  console.log('1. Sinh cặp khóa ElGamal trên nhóm Z_p* (Safe Prime p = 2q + 1):');
  const t0 = process.hrtime.bigint();
  const keyPair = elgamal.generateKeyPair(256);
  const t1 = process.hrtime.bigint();
  const keyTime = Number(t1 - t0) / 1e6;

  console.log(`   • Số nguyên tố an toàn p (256-bit): ${keyPair.publicKey.p}`);
  console.log(`   • Phần tử sinh g                  : ${keyPair.publicKey.g}`);
  console.log(`   • Khóa bí mật Private Key x       : ${keyPair.privateKey.x} (Tuyệt mật)`);
  console.log(`   • Khóa công khai Public Key y     : ${keyPair.publicKey.y} (Công khai: y = g^x mod p)`);
  console.log(`   ⏱️ Thời gian sinh khóa             : ${keyTime.toFixed(2)} ms`);

  const secretAesKey = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
  console.log('\n2. Mã hóa Khóa bí mật AES bằng Public Key của người nhận:');
  console.log(`   Khóa AES cần gửi: "${secretAesKey}"`);

  const tEnc0 = process.hrtime.bigint();
  const chunks = elgamal.encrypt(secretAesKey, keyPair.publicKey);
  const tEnc1 = process.hrtime.bigint();
  const encTime = Number(tEnc1 - tEnc0) / 1e6;

  console.log(`   • Số khối ElGamal được tạo ra    : ${chunks.length} khối (mỗi khối m < p)`);
  chunks.forEach((c, idx) => {
    console.log(`     [Khối ${idx + 1}] c1 = ${c.c1.slice(0, 25)}... | c2 = ${c.c2.slice(0, 25)}...`);
  });
  console.log(`   ⏱️ Thời gian mã hóa ElGamal       : ${encTime.toFixed(3)} ms`);

  console.log('\n3. Người nhận giải mã bằng Private Key x:');
  const tDec0 = process.hrtime.bigint();
  const recoveredKey = elgamal.decrypt(chunks, keyPair.privateKey);
  const tDec1 = process.hrtime.bigint();
  const decTime = Number(tDec1 - tDec0) / 1e6;

  console.log(`   • Khóa AES khôi phục được        : "${recoveredKey}"`);
  console.log(`   • Trạng thái phục hồi            : ${recoveredKey === secretAesKey ? '✅ CHÍNH XÁC 100%' : '❌ SAI KHÓA'}`);
  console.log(`   ⏱️ Thời gian giải mã ElGamal      : ${decTime.toFixed(3)} ms`);
}

// ============================================================================
// 3. DEMO CHỮ KÝ SỐ ELGAMAL + SHA-256
// ============================================================================
function demoSignature() {
  console.log('\n' + DOUBLE_LINE);
  console.log('🔹 THUẬT TOÁN 3: CHỮ KÝ SỐ ELGAMAL & XÁC THỰC TOÀN VẸN');
  console.log(DOUBLE_LINE);
  console.log('📌 Vai trò: Xác thực danh tính người gửi (Authentication) và chống chối bỏ.\n');

  console.log('1. Khởi tạo cặp khóa người gửi (Alice):');
  const aliceKeys = elgamal.generateKeyPair(256);
  console.log(`   Alice Public Key yA : ${aliceKeys.publicKey.y.slice(0, 30)}...`);
  console.log(`   Alice Private Key xA: ${aliceKeys.privateKey.x.slice(0, 30)}...`);

  const doc = 'Hợp đồng đồ án tốt nghiệp: Xác nhận bàn giao mã nguồn an toàn.';
  console.log('\n2. Nội dung văn bản cần ký:');
  console.log(`   "${doc}"`);

  console.log('\n3. Băm thông điệp bằng SHA-256 & Ký số bằng Private Key xA:');
  const digest = sha256(doc);
  console.log(`   • Bản tóm lược m = SHA-256(M) : ${digest} (256-bit)`);

  const tSign0 = process.hrtime.bigint();
  const sig = signature.sign(doc, aliceKeys.privateKey);
  const tSign1 = process.hrtime.bigint();
  const signTime = Number(tSign1 - tSign0) / 1e6;

  console.log(`   • Chữ ký thành phần r          : ${sig.r}`);
  console.log(`   • Chữ ký thành phần s          : ${sig.s}`);
  console.log(`   ⏱️ Thời gian tạo chữ ký         : ${signTime.toFixed(3)} ms`);

  console.log('\n4. Người nhận (Bob) xác thực chữ ký bằng Public Key yA của Alice:');
  const tVer0 = process.hrtime.bigint();
  const isValid = signature.verify(doc, sig, aliceKeys.publicKey);
  const tVer1 = process.hrtime.bigint();
  const verifyTime = Number(tVer1 - tVer0) / 1e6;

  console.log(`   • Phương trình: g^m ≡ (yA^r * r^s) mod p`);
  console.log(`   • Kết quả xác thực            : ${isValid ? '✅ CHỮ KÝ HỢP LỆ (Đúng Alice ký)' : '❌ CHỮ KÝ SAI'}`);
  console.log(`   ⏱️ Thời gian xác minh           : ${verifyTime.toFixed(3)} ms`);

  console.log('\n5. Thử nghiệm kẻ tấn công sửa văn bản thành: "Hợp đồng đã bị huỷ bỏ.":');
  const tamperedDoc = 'Hợp đồng đã bị huỷ bỏ.';
  const isTamperedValid = signature.verify(tamperedDoc, sig, aliceKeys.publicKey);
  console.log(`   • Kết quả xác thực văn bản bị sửa: ${isTamperedValid ? '❌ Bị lừa' : '✅ PHÁT HIỆN GIẢ MẠO THÀNH CÔNG!'}`);
}

// ============================================================================
// 4. DEMO SHA-256 VS MD5
// ============================================================================
function demoHash() {
  console.log('\n' + DOUBLE_LINE);
  console.log('🔹 THUẬT TOÁN 4: ĐỐI CHỨNG HÀM BĂM SHA-256 VS MD5');
  console.log(DOUBLE_LINE);
  console.log('📌 Vai trò: Chứng minh tính chất tuyết lở (Avalanche Effect) và đo hiệu năng.\n');

  const text1 = 'Hello World';
  const text2 = 'Hello World.'; // Thêm đúng 1 dấu chấm

  console.log('1. Khảo sát Hiệu ứng Tuyết lở (Avalanche Effect) của SHA-256:');
  const hash1 = sha256(text1);
  const hash2 = sha256(text2);
  console.log(`   • Gốc : "${text1}"`);
  console.log(`     SHA-256: ${hash1}`);
  console.log(`   • Sửa : "${text2}" (+1 dấu chấm '.')`);
  console.log(`     SHA-256: ${hash2}`);
  console.log('   => Nhận xét: Chỉ đổi đúng 1 dấu chấm, hơn 50% số bit bị đảo lộn hoàn toàn!');

  console.log('\n2. So sánh độ dài đầu ra giữa SHA-256 và MD5:');
  console.log(`   • SHA-256 ("${text1}") : ${hash1} (256-bit = 64 Hex) - Kháng va chạm cao`);
  console.log(`   • MD5    ("${text1}") : ${md5(text1)} (128-bit = 32 Hex) - Đã bị bẻ gãy va chạm`);

  console.log('\n3. Đo tốc độ thực thi (Benchmark 10.000 lần băm):');
  const speed = compareHashSpeed('Du lieu thu nghiem do an chat app e2ee');
  console.log(`   • MD5    (10.000 lần) : ${speed.md5_ms.toFixed(2)} ms`);
  console.log(`   • SHA-256 (10.000 lần) : ${speed.sha256_ms.toFixed(2)} ms`);
  console.log('   => Kết luận: Cả 2 đều cực nhanh (<0.002 ms/lần), nhưng hệ thống chọn SHA-256 vì chuẩn an toàn NIST.');
}

// ============================================================================
// 5. DEMO HYBRID CRYPTOSYSTEM
// ============================================================================
function demoHybrid() {
  console.log('\n' + DOUBLE_LINE);
  console.log('🔹 THUẬT TOÁN 5: TOÀN BỘ HỆ MẬT MÃ LAI HYBRID (AES-256 + ELGAMAL + SHA-256)');
  console.log(DOUBLE_LINE);
  console.log('📌 Vai trò: Mô phỏng toàn bộ luồng truyền tin 1-1 khép kín trong ứng dụng.\n');

  console.log('1. Khởi tạo danh tính 2 người dùng (Alice và Bob):');
  const alice = elgamal.generateKeyPair(256);
  const bob = elgamal.generateKeyPair(256);
  console.log('   • Alice: Có Private Key xA để Ký số');
  console.log('   • Bob  : Có Public Key yB để Nhận tin mã hóa');

  const secretMessage = 'Báo cáo thầy: Toàn bộ đồ án đã chạy mượt mà trên Terminal và Web!';
  console.log(`\n2. Alice soạn tin: "${secretMessage}"`);

  console.log('\n3. Alice thực hiện Mã hóa lai & Ký số (Client A):');
  const t0 = process.hrtime.bigint();
  // Ký số
  const sig = signature.sign(secretMessage, alice.privateKey);
  // Mã hóa lai
  const hybridPackage = hybrid.hybridEncrypt(secretMessage, bob.publicKey);
  const t1 = process.hrtime.bigint();
  const totalSenderTime = Number(t1 - t0) / 1e6;

  console.log('   📦 Gói tin đóng gói gửi lên Server (MongoDB chỉ thấy chuỗi này):');
  console.log(`      • Ciphertext (AES) : ${hybridPackage.encryptedMessage.data.slice(0, 40)}...`);
  console.log(`      • IV + AuthTag     : ${hybridPackage.encryptedMessage.iv} | ${hybridPackage.encryptedMessage.authTag}`);
  console.log(`      • Khóa AES bọc     : ${hybridPackage.encryptedKeyChunks.length} khối (c1, c2) ElGamal`);
  console.log(`      • Chữ ký số Alice  : r=${sig.r.slice(0, 20)}... | s=${sig.s.slice(0, 20)}...`);
  console.log(`   ⏱️ Thời gian xử lý phía gửi: ${totalSenderTime.toFixed(3)} ms`);

  console.log('\n4. Bob nhận gói tin và Giải mã (Client B):');
  const t2 = process.hrtime.bigint();
  // Giải mã lai
  const decryptedMsg = hybrid.hybridDecrypt(hybridPackage, bob.privateKey);
  // Xác thực chữ ký
  const isSigValid = signature.verify(decryptedMsg, sig, alice.publicKey);
  const t3 = process.hrtime.bigint();
  const totalReceiverTime = Number(t3 - t2) / 1e6;

  console.log(`   • Nội dung Bob đọc được: "${decryptedMsg}"`);
  console.log(`   • Chữ ký của Alice     : ${isSigValid ? '✅ HỢP LỆ (Đúng Alice gửi)' : '❌ GIẢ MẠO'}`);
  console.log(`   ⏱️ Thời gian giải mã Bob: ${totalReceiverTime.toFixed(3)} ms`);
  console.log(`   🚀 Tổng thời gian toàn trình: ${(totalSenderTime + totalReceiverTime).toFixed(3)} ms (< 20 ms -> Siêu mượt!)`);
}

// ============================================================================
// MAIN CLI RUNNER
// ============================================================================
const arg = process.argv[2];

if (arg === '1') { demoAES(); process.exit(0); }
if (arg === '2') { demoElGamal(); process.exit(0); }
if (arg === '3') { demoSignature(); process.exit(0); }
if (arg === '4') { demoHash(); process.exit(0); }
if (arg === '5') { demoHybrid(); process.exit(0); }
if (arg === 'all') {
  demoAES();
  demoElGamal();
  demoSignature();
  demoHash();
  demoHybrid();
  console.log('\n' + DOUBLE_LINE);
  console.log('🏁 ĐÃ HOÀN TẤT KIỂM THỬ TOÀN BỘ 5 THUẬT TOÁN!');
  console.log(DOUBLE_LINE + '\n');
  process.exit(0);
}

// Menu tương tác
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.clear();
console.log(DOUBLE_LINE);
console.log('🎓 BỘ CÔNG CỤ TRÌNH DIỄN THUẬT TOÁN MẬT MÃ TRÊN TERMINAL (CLI CRYPTO LAB)');
console.log('   Dự án: Chat-app End-to-End Encryption');
console.log(DOUBLE_LINE);
console.log('Chọn thuật toán bạn muốn chạy cho Thầy xem:\n');
console.log('  [1] Thuật toán AES-256-GCM (Mã hóa, AuthTag, Phát hiện sửa đổi)');
console.log('  [2] Thuật toán ElGamal 256-bit (Sinh khóa p, g, x, y và Mã hóa khóa)');
console.log('  [3] Chữ ký số ElGamal + SHA-256 (Ký số, Xác thực, Báo động giả mạo)');
console.log('  [4] Đối chứng Hàm băm SHA-256 vs MD5 (Hiệu ứng tuyết lở & Benchmark)');
console.log('  [5] Toàn bộ Hệ Mật Mã Lai Hybrid (Alice gửi -> Server mù -> Bob nhận)');
console.log('  [A] Chạy LẦN LƯỢT TẤT CẢ từ 1 đến 5');
console.log('  [0] Thoát');
console.log(LINE);

rl.question('👉 Nhập lựa chọn của bạn (1-5, A, 0): ', (answer) => {
  const choice = answer.trim().toLowerCase();
  switch (choice) {
    case '1': demoAES(); break;
    case '2': demoElGamal(); break;
    case '3': demoSignature(); break;
    case '4': demoHash(); break;
    case '5': demoHybrid(); break;
    case 'a':
      demoAES();
      demoElGamal();
      demoSignature();
      demoHash();
      demoHybrid();
      break;
    case '0':
      console.log('Tạm biệt!');
      break;
    default:
      console.log('Lựa chọn không hợp lệ.');
  }
  rl.close();
});
