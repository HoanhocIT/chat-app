/**
 * Message.js
 * Server CHỈ lưu dữ liệu đã mã hóa — không bao giờ thấy nội dung gốc.
 * Cấu trúc khớp trực tiếp với output của backend/src/crypto/hybrid.js và signature.js.
 */

const mongoose = require('mongoose');

// Kết quả từ aes.encryptAES() — nội dung tin nhắn đã mã hóa
const EncryptedMessageSchema = new mongoose.Schema(
  {
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    data: { type: String, required: true },
  },
  { _id: false }
);

// Kết quả từ elgamal.encrypt() — khóa AES đã mã hóa, có thể chia nhiều khối
const CipherChunkSchema = new mongoose.Schema(
  {
    c1: { type: String, required: true },
    c2: { type: String, required: true },
  },
  { _id: false }
);

// Kết quả từ signature.sign() — chữ ký số ElGamal của người gửi
const SignatureSchema = new mongoose.Schema(
  {
    r: { type: String, required: true },
    s: { type: String, required: true },
  },
  { _id: false }
);

// File đính kèm lưu trên cloud (S3/Cloudinary), kèm SHA-256 để kiểm tra toàn vẹn
const AttachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true }, // so khớp lại sau khi tải về
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Với chat nhóm: mỗi người nhận cần 1 bản encryptedKeyChunks riêng
    // (vì mỗi người có public key khác nhau). Với chat 1-1, mảng này có 1 phần tử.
    encryptedMessage: { type: EncryptedMessageSchema, required: true },
    recipientKeys: [
      {
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        encryptedKeyChunks: { type: [CipherChunkSchema], required: true },
      },
    ],

    // Server KHÔNG THỂ tự xác thực chữ ký này vì không có nội dung gốc (đã mã hóa).
    // Việc verify chỉ thực hiện được ở client, sau khi người nhận giải mã ra plaintext.
    signature: { type: SignatureSchema, required: true },

    attachments: { type: [AttachmentSchema], default: [] },

    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
