// ================================
// TEST CRYPTO MODULE
// ================================
// Chạy: node test-crypto.js
// ================================

const { ElGamal, AES } = require('./crypto');

console.log('=== TEST MÃ HÓA ELGAMAL + AES ===\n');

// 1. Test ElGamal
console.log('1. Test ElGamal:');
console.log('   Tạo cặp khóa...');
const keyPair = ElGamal.generateKeyPair();
console.log('   ✅ Public Key:', keyPair.publicKey);
console.log('   ✅ Private Key:', keyPair.privateKey);

console.log('   Mã hóa message...');
const secretMessage = 'Khóa AES bí mật 123';
const encrypted = ElGamal.encrypt(secretMessage, keyPair.publicKey);
console.log('   ✅ Cipher text:', encrypted);

console.log('   Giải mã...');
const decrypted = ElGamal.decrypt(encrypted, keyPair.privateKey);
console.log('   ✅ Message gốc:', decrypted);

if (secretMessage === decrypted) {
    console.log('   🎉 ElGamal hoạt động chính xác!\n');
} else {
    console.log('   ❌ ElGamal có lỗi!\n');
}

// 2. Test AES
console.log('2. Test AES:');
console.log('   Tạo khóa AES...');
const aesKey = AES.generateKey();
console.log('   ✅ Khóa AES:', aesKey);

console.log('   Mã hóa tin nhắn...');
const chatMessage = 'Xin chào, đây là tin nhắn bí mật!';
const encryptedMsg = AES.encrypt(chatMessage, aesKey);
console.log('   ✅ Tin nhắn mã hóa:', encryptedMsg);

console.log('   Giải mã...');
const decryptedMsg = AES.decrypt(encryptedMsg, aesKey);
console.log('   ✅ Tin nhắn gốc:', decryptedMsg);

if (chatMessage === decryptedMsg) {
    console.log('   🎉 AES hoạt động chính xác!\n');
} else {
    console.log('   ❌ AES có lỗi!\n');
}

// 3. Test kết hợp ElGamal + AES
console.log('3. Test kết hợp ElGamal + AES:');
console.log('   Mô phỏng quy trình chat bảo mật:\n');

// Bob tạo cặp khóa ElGamal
const bobKeys = ElGamal.generateKeyPair();
console.log('   Bob tạo cặp khóa ElGamal ✅');

// Alice muốn gửi tin nhắn cho Bob
const messageFromAlice = 'Chào Bob, đây là tin nhắn bí mật từ Alice!';
console.log('   Alice muốn gửi:', messageFromAlice);

// Alice tạo khóa AES và mã hóa tin nhắn
const { aesKey: aliceAesKey, encryptedMessage } = AES.encryptMessage(messageFromAlice);
console.log('   Alice mã hóa tin nhắn bằng AES ✅');

// Alice mã hóa khóa AES bằng public key của Bob
const encryptedAesKey = ElGamal.encrypt(aliceAesKey, bobKeys.publicKey);
console.log('   Alice mã hóa khóa AES bằng public key của Bob ✅');

// Alice gửi: { encryptedMessage, encryptedAesKey } cho Bob
console.log('   Alice gửi dữ liệu đã mã hóa cho Bob ✅\n');

// Bob nhận và giải mã
console.log('   Bob nhận được dữ liệu...');
const decryptedAesKey = ElGamal.decrypt(encryptedAesKey, bobKeys.privateKey);
console.log('   Bob giải mã khóa AES bằng private key ✅');

const decryptedMessage = AES.decrypt(encryptedMessage, decryptedAesKey);
console.log('   Bob giải mã tin nhắn bằng khóa AES ✅');
console.log('   Bob đọc được:', decryptedMessage);

if (messageFromAlice === decryptedMessage) {
    console.log('\n🎉🎉🎉 TOÀN BỘ HỆ THỐNG MÃ HÓA HOẠT ĐỘNG CHÍNH XÁC! 🎉🎉🎉');
} else {
    console.log('\n❌ Có lỗi trong quy trình mã hóa!');
}